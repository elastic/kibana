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
// import { resolve } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import cypress from 'cypress';

import {
  FunctionalTestRunner,
  readConfigFile,
  runElasticsearch,
  runKibanaServer,
  EsVersion,
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
// import pRetry from 'p-retry';
import { renderSummaryTable } from './print_run';
import { getLocalhostRealIp } from '../common/localhost_services';

const retrieveIntegrations = (
  specPattern: string[],
  chunksTotal: string = '1',
  chunkIndex: string = '1'
) => {
  const integrationsPaths = globby.sync(specPattern);
  const chunkSize = Math.ceil(integrationsPaths.length / parseInt(chunksTotal, 10));

  console.error('integrationsPaths', integrationsPaths, chunksTotal, chunkSize, chunkIndex);

  return _.chunk(integrationsPaths, chunkSize)[parseInt(chunkIndex, 10) - 1];
};

export const cli = () => {
  run(
    async (extraoptions) => {
      console.error('extraoptions', extraoptions);
      const { argv } = yargs(process.argv.slice(2));

      console.error('process.argv', argv);

      const files = retrieveIntegrations(
        argv?.spec
          ? [argv.spec as string]
          : [
              // 'cypress/e2e/cases/creation.cy.ts',
              // 'cypress/e2e/cases/privileges.cy.ts',
              '**/cypress/e2e/cases/*.cy.ts',
              '**/cypress/e2e/dashboards/*.cy.ts',
              '**/cypress/e2e/detection_alerts/*.cy.ts',
              // '**/cypress/e2e/detection_rules/*.cy.ts',
            ],
        process.env.CLI_NUMBER,
        process.env.CLI_COUNT
      );

      // console.error('process', process);
      // console.error('process.argv', argv);
      console.error('files', files);

      const esPorts: number[] = [9200, 9220];
      const kibanaPorts: number[] = [5601, 5620];
      const fleetServerPorts: number[] = [8220];

      const getEsPort = () => {
        console.error('getEsPort', esPorts);
        const esPort = parseInt(`92${Math.floor(Math.random() * 89) + 10}`, 10);
        if (esPorts.includes(esPort)) {
          return getEsPort();
        }
        esPorts.push(esPort);
        return esPort;
      };

      const getKibanaPort = () => {
        console.error('getKibanaPort', kibanaPorts);
        const kibanaPort = parseInt(`56${Math.floor(Math.random() * 89) + 10}`, 10);
        if (kibanaPorts.includes(kibanaPort)) {
          return getKibanaPort();
        }
        kibanaPorts.push(kibanaPort);
        return kibanaPort;
      };

      const getFleetServerPort = () => {
        console.error('getFleetServerPort', fleetServerPorts);
        const fleetServerPort = parseInt(`82${Math.floor(Math.random() * 89) + 10}`, 10);
        if (fleetServerPorts.includes(fleetServerPort)) {
          return getFleetServerPort();
        }
        fleetServerPorts.push(fleetServerPort);
        return fleetServerPort;
      };

      const cleanupServerPorts = ({ esPort, kibanaPort }) => {
        _.pull(esPorts, esPort);
        _.pull(kibanaPorts, kibanaPort);
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

        if (expressionStatement?.expression?.arguments?.length === 3) {
          const callExpressionArguments = _.find(callExpression?.arguments, [
            'type',
            'ObjectExpression',
          ]) as ObjectExpression | undefined;

          const callExpressionProperties = _.find(callExpressionArguments?.properties, [
            'key.name',
            'env',
          ]) as ObjectProperty[] | undefined;

          const ftrConfig = _.find(callExpressionProperties?.value?.properties, [
            'key.name',
            'ftrConfig',
          ]);

          if (!ftrConfig) {
            return {};
          }

          const configValues = _.reduce(
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
                acc[key] = value;
              }
              return acc;
            },
            {}
          );
          return configValues;
        }
        return undefined;
      };

      const log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });

      const hostRealIp = await getLocalhostRealIp();

      await pMap(
        files,
        // files.slice(0, 2),
        // [files[0]],
        async (filePath, index) => {
          let result;
          await withProcRunner(log, async (procs) => {
            const abortCtrl = new AbortController();

            const onEarlyExit = (msg: string) => {
              log.error(msg);
              abortCtrl.abort();
            };

            const esPort = getEsPort();
            const kibanaPort = getKibanaPort();
            const fleetServerPort = getFleetServerPort();
            const configFromTestFile = parseTestFileConfig(filePath);

            const config = await readConfigFile(
              log,
              EsVersion.getDefault(),
              argv.ftrConfigFile,
              {
                servers: {
                  elasticsearch: {
                    port: esPort,
                  },
                  kibana: {
                    port: kibanaPort,
                  },
                  fleetserver: {
                    port: fleetServerPort,
                  },
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

            console.error(
              'xxxxx2',
              config,
              config.get('servers'),
              config.get('kbnTestServer.serverArgs')
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

            console.error('options', options, kibanaPort);

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

            console.error('customEnv', customEnv);

            // const child = execa.node(require.resolve('./subprocess'));

            // const child = await execa('node', [require.resolve('./subprocess')]);

            // console.error('child', child);

            // const subprocess = execa('node', [require.resolve('./subprocess')], {
            //   extendEnv: true,
            //   env: {
            //     ...customEnv,
            //     CYPRESS_SPEC: filePath,
            //     CYPRESS_CONFIG_FILE: argv.configFile,
            //   },
            // });
            // subprocess.stdout.pipe(process.stdout);

            // try {
            //   const { stdout } = await subprocess;
            //   console.log('child output:', stdout);
            // } catch (error) {
            //   console.error('child failed:', error);
            // }

            // child.on('message', (msg) => {
            //   console.log('The message between IPC channel, in app.js\n', msg);
            //   // resolve(msg);
            // });

            // console.error('child', process.argv, require.resolve('.'), child);

            // console.error({
            //   spec: filePath,
            //   headed: true,
            //   configFile: argv.configFile,
            //   config: {
            //     env: customEnv,
            //     baseUrl: `http://localhost:${kibanaPort}`,
            //   },
            // });

            // child.send({
            //   spec: filePath,
            //   headed: true,
            //   configFile: argv.configFile,
            //   config: {
            //     env: customEnv,
            //     baseUrl: `http://localhost:${kibanaPort}`,
            //   },
            // });

            // return new Promise((resolve) => {
            // child.on('message', (msg) => {
            //   console.log('The message between IPC channel, in app.js\n', msg);
            //   resolve(msg);
            // });
            //   setTimeout(() => resolve({}), 1000000);
            // });

            // await procs.run('cypress', {
            //   cmd: 'yarn',
            //   args: ['cypress:run', '--spec', filePath],
            //   cwd: resolve(__dirname, '../../'),
            //   env: customEnv,
            //   wait: true,
            // });

            // await cypress.open({
            //   configFile: require.resolve(`../../../${argv.configFile}`),
            //   config: {
            //     e2e: {
            //       baseUrl: `http://localhost:${kibanaPort}`,
            //     },
            //   },
            //   env: customEnv,
            //   // ...commonCypressConfig,
            // });

            try {
              result = await cypress.run({
                browser: 'chrome',
                spec: filePath,
                configFile: argv.configFile,
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

            await procs.stop('kibana');
            shutdownEs();
            cleanupServerPorts({ esPort, kibanaPort });

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
        { concurrency: 3 }
      ).then((results) => {
        // console.error('results', results);
        renderSummaryTable(results as CypressCommandLine.CypressRunResult[]);

        const hasFailedTests = _.some(results, (result) => result.failures > 0);

        if (hasFailedTests) {
          throw new Error('1');
        }

        // process.exit(_.some(results, (result) => result.failures > 0) ? 1 : 0);
      });
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
