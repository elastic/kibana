/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import _ from 'lodash';
import * as fs from 'fs';
import globby from 'globby';
import pMap from 'p-map';
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import cypress from 'cypress';

import {
  EsVersion,
  FunctionalTestRunner,
  readConfigFile,
  runElasticsearch,
  runKibanaServer,
} from '@kbn/test';

import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';
import * as parser from '@babel/parser';
import type {
  ExpressionStatement,
  Identifier,
  ObjectExpression,
  ObjectProperty,
} from '@babel/types';

import { createFailError } from '@kbn/dev-cli-errors';
import { renderSummaryTable } from './print_run';
import { getLocalhostRealIp } from '../endpoint/common/localhost_services';

const retrieveIntegrations = (
  specPattern: string[],
  chunksTotal: number = process.env.BUILDKITE_PARALLEL_JOB_COUNT
    ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
    : 1,
  chunkIndex: number = process.env.BUILDKITE_PARALLEL_JOB
    ? parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10)
    : 0
) => {
  const integrationsPaths = globby.sync(specPattern);
  const chunkSize = Math.ceil(integrationsPaths.length / chunksTotal);

  return _.chunk(integrationsPaths, chunkSize)[chunkIndex];
};

export const cli = () => {
  run(
    async () => {
      const { argv } = yargs(process.argv.slice(2));

      const cypressConfigFile = await import(require.resolve(`../../${argv.configFile}`));
      const spec: string | undefined = argv?.spec as string;
      const files = retrieveIntegrations(
        spec
          ? spec.includes(',')
            ? spec.split(',')
            : [spec]
          : cypressConfigFile?.e2e?.specPattern
          ? cypressConfigFile?.e2e?.specPattern
          : [
              // 'cypress/e2e/cases/creation.cy.ts',
              // 'cypress/e2e/cases/privileges.cy.ts',
              '**/cypress/e2e/cases/*.cy.ts',
              '**/cypress/e2e/dashboards/*.cy.ts',
              '**/cypress/e2e/detection_alerts/*.cy.ts',
              // '**/cypress/e2e/detection_rules/*.cy.ts',
            ]
      );

      if (!files.length) {
        throw new Error('No files found');
      }

      const esPorts: number[] = [9200, 9220];
      const kibanaPorts: number[] = [5601, 5620];
      const fleetServerPorts: number[] = [8220];

      const getEsPort = <T>(): T | number => {
        const esPort = parseInt(`92${Math.floor(Math.random() * 89) + 10}`, 10);
        if (esPorts.includes(esPort)) {
          return getEsPort();
        }
        esPorts.push(esPort);
        return esPort;
      };

      const getKibanaPort = <T>(): T | number => {
        const kibanaPort = parseInt(`56${Math.floor(Math.random() * 89) + 10}`, 10);
        if (kibanaPorts.includes(kibanaPort)) {
          return getKibanaPort();
        }
        kibanaPorts.push(kibanaPort);
        return kibanaPort;
      };

      const getFleetServerPort = <T>(): T | number => {
        const fleetServerPort = parseInt(`82${Math.floor(Math.random() * 89) + 10}`, 10);
        if (fleetServerPorts.includes(fleetServerPort)) {
          return getFleetServerPort();
        }
        fleetServerPorts.push(fleetServerPort);
        return fleetServerPort;
      };

      const cleanupServerPorts = ({
        esPort,
        kibanaPort,
        fleetServerPort,
      }: {
        esPort: number;
        kibanaPort: number;
        fleetServerPort: number;
      }) => {
        _.pull(esPorts, esPort);
        _.pull(kibanaPorts, kibanaPort);
        _.pull(fleetServerPorts, fleetServerPort);
      };

      const parseTestFileConfig = (
        filePath: string
      ): Record<string, string | number | Record<string, string | number>> | undefined => {
        const testFile = fs.readFileSync(filePath, { encoding: 'utf8' });

        const ast = parser.parse(testFile, {
          sourceType: 'module',
          plugins: ['typescript'],
        });

        const expressionStatement = _.find(ast.program.body, ['type', 'ExpressionStatement']) as
          | ExpressionStatement
          | undefined;

        const callExpression = expressionStatement?.expression;
        // @ts-expect-error
        if (expressionStatement?.expression?.arguments?.length === 3) {
          // @ts-expect-error
          const callExpressionArguments = _.find(callExpression?.arguments, [
            'type',
            'ObjectExpression',
          ]) as ObjectExpression | undefined;

          const callExpressionProperties = _.find(callExpressionArguments?.properties, [
            'key.name',
            'env',
          ]) as ObjectProperty[] | undefined;
          // @ts-expect-error
          const ftrConfig = _.find(callExpressionProperties?.value?.properties, [
            'key.name',
            'ftrConfig',
          ]);

          if (!ftrConfig) {
            return {};
          }

          return _.reduce(
            ftrConfig.value.properties,
            (acc: Record<string, string | number | Record<string, string>>, property) => {
              const key = (property.key as Identifier).name;
              let value;
              if (property.value.type === 'ArrayExpression') {
                value = _.map(property.value.elements, (element) => {
                  if (element.type === 'StringLiteral') {
                    return element.value as string;
                  }
                  return element.value as string;
                });
              }
              if (key && value) {
                // @ts-expect-error
                acc[key] = value;
              }
              return acc;
            },
            {}
          );
        }
        return undefined;
      };

      const log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });

      const hostRealIp = getLocalhostRealIp();

      const isOpen = argv._[0] === 'open';

      await pMap(
        files,
        async (filePath) => {
          let result:
            | CypressCommandLine.CypressRunResult
            | CypressCommandLine.CypressFailedRunResult
            | undefined;
          await withProcRunner(log, async (procs) => {
            const abortCtrl = new AbortController();

            const onEarlyExit = (msg: string) => {
              log.error(msg);
              abortCtrl.abort();
            };

            const esPort: number = getEsPort();
            const kibanaPort: number = getKibanaPort();
            const fleetServerPort: number = getFleetServerPort();
            const configFromTestFile = parseTestFileConfig(filePath);

            const config = await readConfigFile(
              log,
              EsVersion.getDefault(),
              _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile,
              {
                servers: {
                  elasticsearch: {
                    port: esPort,
                  },
                  kibana: {
                    port: kibanaPort,
                  },
                  // fleetserver: {
                  //   port: fleetServerPort,
                  // },
                },
                kbnTestServer: {
                  serverArgs: [
                    `--server.port=${kibanaPort}`,
                    `--elasticsearch.hosts=http://localhost:${esPort}`,
                  ],
                },
              },
              (vars) => {
                const hasFleetServerArgs = _.some(
                  vars.kbnTestServer.serverArgs,
                  (value) =>
                    value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
                    value.includes('--xpack.fleet.agents.elasticsearch.host')
                );

                vars.kbnTestServer.serverArgs = _.filter(
                  vars.kbnTestServer.serverArgs,
                  (value) =>
                    !(
                      value.includes('--elasticsearch.hosts=http://localhost:9220') ||
                      value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
                      value.includes('--xpack.fleet.agents.elasticsearch.host')
                    )
                );

                if (
                  // @ts-expect-error
                  configFromTestFile?.enableExperimental?.length &&
                  _.some(vars.kbnTestServer.serverArgs, (value) =>
                    value.includes('--xpack.securitySolution.enableExperimental')
                  )
                ) {
                  vars.kbnTestServer.serverArgs = _.filter(
                    vars.kbnTestServer.serverArgs,
                    (value) => !value.includes('--xpack.securitySolution.enableExperimental')
                  );
                  vars.kbnTestServer.serverArgs.push(
                    `--xpack.securitySolution.enableExperimental=${JSON.stringify(
                      configFromTestFile?.enableExperimental
                    )}`
                  );
                }

                if (hasFleetServerArgs) {
                  vars.kbnTestServer.serverArgs.push(
                    `--xpack.fleet.agents.fleet_server.hosts=["https://${hostRealIp}:${fleetServerPort}"]`,
                    `--xpack.fleet.agents.elasticsearch.host=http://${hostRealIp}:${esPort}`
                  );
                }

                return vars;
              }
            );

            const lifecycle = new Lifecycle(log);

            const providers = new ProviderCollection(log, [
              ...readProviderSpec('Service', {
                lifecycle: () => lifecycle,
                log: () => log,
                config: () => config,
              }),
              ...readProviderSpec('Service', config.get('services')),
            ]);

            const options = {
              installDir: process.env.KIBANA_INSTALL_DIR,
            };

            const shutdownEs = await runElasticsearch({
              config,
              log,
              name: `ftr-${esPort}`,
              esFrom: 'snapshot',
              onEarlyExit,
            });

            await runKibanaServer({
              procs,
              config,
              installDir: options?.installDir,
              extraKbnOpts: options?.installDir
                ? []
                : ['--dev', '--no-dev-config', '--no-dev-credentials'],
              onEarlyExit,
            });

            await providers.loadAll();

            const functionalTestRunner = new FunctionalTestRunner(
              log,
              config,
              EsVersion.getDefault()
            );

            const customEnv = await functionalTestRunner.run(abortCtrl.signal);

            if (isOpen) {
              await cypress.open({
                configFile: require.resolve(`../../${argv.configFile}`),
                config: {
                  e2e: {
                    baseUrl: `http://localhost:${kibanaPort}`,
                  },
                  env: customEnv,
                },
                // ...commonCypressConfig,
              });
            } else {
              try {
                result = await cypress.run({
                  browser: 'chrome',
                  spec: filePath,
                  configFile: argv.configFile as string,
                  reporter: argv.reporter as string,
                  reporterOptions: argv.reporterOptions,
                  config: {
                    e2e: {
                      baseUrl: `http://localhost:${kibanaPort}`,
                    },
                    numTestsKeptInMemory: 0,
                    env: customEnv,
                  },
                });
              } catch (error) {
                result = error;
              }
            }

            await procs.stop('kibana');
            shutdownEs();
            cleanupServerPorts({ esPort, kibanaPort, fleetServerPort });

            // return pRetry(
            //   () =>
            //     cypress
            //       .run({
            //         browser: 'chrome',
            //         spec: filePath,
            //         headed: true,
            //         configFile: argv.configFile,
            //         config: {
            //           env: customEnv,
            //           baseUrl: `http://localhost:${kibanaPort}`,
            //         },
            //       })
            //       .then((results) => {
            //         if (results.status === 'finished') {
            //           _.forEach(results.runs, (run) => {
            //             _.forEach(run.tests, (test) => {
            //               _.forEach(test.attempts, (attempt) => {
            //                 if (
            //                   attempt.state === 'failed' &&
            //                   attempt.error &&
            //                   attempt.error.name !== 'AssertionError'
            //                 ) {
            //                   throw new Error(
            //                     `Non AssertionError in ${filePath}, retrying test. Error message: ${attempt.error.message}`
            //                   );
            //                 }
            //               });
            //             });
            //           });
            //         }
            //         return results;
            //       }),
            //   {
            //     retries: 1,
            //   }
            // ).finally(() => {
            //   cleanupServerPorts({ esPort, kibanaPort });
            // });

            return result;
          });
          return result;
        },
        { concurrency: !isOpen ? 3 : 1 }
      ).then((results) => {
        renderSummaryTable(results as CypressCommandLine.CypressRunResult[]);
        const hasFailedTests = _.some(
          results,
          (result) => result?.status === 'finished' && result.totalFailed > 0
        );
        if (hasFailedTests) {
          throw createFailError('Not all tests passed');
        }
      });
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
