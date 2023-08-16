/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import _ from 'lodash';
import globby from 'globby';
import pMap from 'p-map';
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import cypress from 'cypress';
import { findChangedFiles } from 'find-cypress-specs';
import minimatch from 'minimatch';
import path from 'path';

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

import { createFailError } from '@kbn/dev-cli-errors';
import pRetry from 'p-retry';
import { renderSummaryTable } from './print_run';
import { getLocalhostRealIp } from '../endpoint/common/localhost_services';
import { parseTestFileConfig } from './utils';

/**
 * Retrieve test files using a glob pattern.
 * If process.env.RUN_ALL_TESTS is true, returns all matching files, otherwise, return files that should be run by this job based on process.env.BUILDKITE_PARALLEL_JOB_COUNT and process.env.BUILDKITE_PARALLEL_JOB
 */
const retrieveIntegrations = (
  /** Pattern passed to globby to find spec files. */ specPattern: string[]
) => {
  const integrationsPaths = globby.sync(specPattern);

  if (process.env.RUN_ALL_TESTS === 'true') {
    return integrationsPaths;
  } else {
    // The number of instances of this job were created
    const chunksTotal: number = process.env.BUILDKITE_PARALLEL_JOB_COUNT
      ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
      : 1;
    // An index which uniquely identifies this instance of the job
    const chunkIndex: number = process.env.BUILDKITE_PARALLEL_JOB
      ? parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10)
      : 0;

    const integrationsPathsForChunk: string[] = [];

    for (let i = chunkIndex; i < integrationsPaths.length; i += chunksTotal) {
      integrationsPathsForChunk.push(integrationsPaths[i]);
    }

    return integrationsPathsForChunk;
  }
};

export const cli = () => {
  run(
    async () => {
      const { argv } = yargs(process.argv.slice(2)).coerce('env', (arg: string) =>
        arg.split(',').reduce((acc, curr) => {
          const [key, value] = curr.split('=');
          if (key === 'burn') {
            acc[key] = parseInt(value, 10);
          } else {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string | number>)
      );

      const isOpen = argv._[0] === 'open';
      const cypressConfigFilePath = require.resolve(
        `../../${_.isArray(argv.configFile) ? _.last(argv.configFile) : argv.configFile}`
      ) as string;
      const cypressConfigFile = await import(cypressConfigFilePath);
      const spec: string | undefined = argv?.spec as string;
      let files = retrieveIntegrations(spec ? [spec] : cypressConfigFile?.e2e?.specPattern);

      if (argv.changedSpecsOnly) {
        const basePath = process.cwd().split('kibana/')[1];
        files = findChangedFiles('main', false)
          .filter(
            minimatch.filter(path.join(basePath, cypressConfigFile?.e2e?.specPattern), {
              matchBase: true,
            })
          )
          .map((filePath: string) => filePath.replace(basePath, '.'));

        if (!files?.length) {
          // eslint-disable-next-line no-process-exit
          return process.exit(0);
        }
      }

      if (!files?.length) {
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
        if (isOpen) {
          return 5620;
        }

        const kibanaPort = parseInt(`56${Math.floor(Math.random() * 89) + 10}`, 10);
        if (kibanaPorts.includes(kibanaPort)) {
          return getKibanaPort();
        }
        kibanaPorts.push(kibanaPort);
        return kibanaPort;
      };

      const getFleetServerPort = <T>(): T | number => {
        if (isOpen) {
          return 8220;
        }

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

      const log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });

      const hostRealIp = getLocalhostRealIp();

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
              path.resolve(
                _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile
              ),
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

                if (configFromTestFile?.license) {
                  if (vars.serverless) {
                    log.warning(
                      `'ftrConfig.license' ignored. Value does not apply to kibana when running in serverless.\nFile: ${filePath}`
                    );
                  } else {
                    vars.esTestCluster.license = configFromTestFile.license;
                  }
                }

                if (hasFleetServerArgs) {
                  vars.kbnTestServer.serverArgs.push(
                    `--xpack.fleet.agents.elasticsearch.host=http://${hostRealIp}:${esPort}`
                  );
                }

                // Serverless Specific
                if (vars.serverless) {
                  log.info(`Serverless mode detected`);

                  if (configFromTestFile?.productTypes) {
                    vars.kbnTestServer.serverArgs.push(
                      `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
                        ...configFromTestFile.productTypes,
                        // Why spread it twice?
                        // The `serverless.security.yml` file by default includes two product types as of this change.
                        // Because it's an array, we need to ensure that existing values are "removed" and the ones
                        // defined here are added. To do that, we duplicate the `productTypes` passed so that all array
                        // elements in that YAML file are updated. The Security serverless plugin has code in place to
                        // dedupe.
                        ...configFromTestFile.productTypes,
                      ])}`
                    );
                  }
                } else if (configFromTestFile?.productTypes) {
                  log.warning(
                    `'ftrConfig.productTypes' ignored. Value applies only when running kibana is serverless.\nFile: ${filePath}`
                  );
                }

                return vars;
              }
            );

            log.info(`
----------------------------------------------
Cypress FTR setup for file: ${filePath}:
----------------------------------------------

${JSON.stringify(config.getAll(), null, 2)}

----------------------------------------------
`);

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
              ci: process.env.CI,
            };

            const shutdownEs = await pRetry(
              async () =>
                runElasticsearch({
                  config,
                  log,
                  name: `ftr-${esPort}`,
                  esFrom: 'snapshot',
                  onEarlyExit,
                }),
              { retries: 2, forever: false }
            );

            await runKibanaServer({
              procs,
              config,
              installDir: options?.installDir,
              extraKbnOpts:
                options?.installDir || options?.ci || !isOpen
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

            const createUrlFromFtrConfig = (
              type: 'elasticsearch' | 'kibana' | 'fleetserver',
              withAuth: boolean = false
            ): string => {
              const getKeyPath = (keyPath: string = ''): string => {
                return `servers.${type}${keyPath ? `.${keyPath}` : ''}`;
              };

              if (!config.get(getKeyPath())) {
                throw new Error(`Unable to create URL for ${type}. Not found in FTR config at `);
              }

              const url = new URL('http://localhost');

              url.port = config.get(getKeyPath('port'));
              url.protocol = config.get(getKeyPath('protocol'));
              url.hostname = config.get(getKeyPath('hostname'));

              if (withAuth) {
                url.username = config.get(getKeyPath('username'));
                url.password = config.get(getKeyPath('password'));
              }

              return url.toString().replace(/\/$/, '');
            };

            const baseUrl = createUrlFromFtrConfig('kibana');

            const ftrEnv = await pRetry(() => functionalTestRunner.run(abortCtrl.signal), {
              retries: 1,
            });

            log.debug(
              `Env. variables returned by [functionalTestRunner.run()]:\n`,
              JSON.stringify(ftrEnv, null, 2)
            );

            // Normalized the set of available env vars in cypress
            const cyCustomEnv = {
              ...ftrEnv,

              // NOTE:
              // ELASTICSEARCH_URL needs to be created here with auth because SIEM cypress setup depends on it. At some
              // points we should probably try to refactor that code to use `ELASTICSEARCH_URL_WITH_AUTH` instead
              ELASTICSEARCH_URL:
                ftrEnv.ELASTICSEARCH_URL ?? createUrlFromFtrConfig('elasticsearch', true),
              ELASTICSEARCH_URL_WITH_AUTH: createUrlFromFtrConfig('elasticsearch', true),
              ELASTICSEARCH_USERNAME:
                ftrEnv.ELASTICSEARCH_USERNAME ?? config.get('servers.elasticsearch.username'),
              ELASTICSEARCH_PASSWORD:
                ftrEnv.ELASTICSEARCH_PASSWORD ?? config.get('servers.elasticsearch.password'),

              FLEET_SERVER_URL: createUrlFromFtrConfig('fleetserver'),

              KIBANA_URL: baseUrl,
              KIBANA_URL_WITH_AUTH: createUrlFromFtrConfig('kibana', true),
              KIBANA_USERNAME: config.get('servers.kibana.username'),
              KIBANA_PASSWORD: config.get('servers.kibana.password'),

              ...argv.env,
            };

            log.info(`
----------------------------------------------
Cypress run ENV for file: ${filePath}:
----------------------------------------------

${JSON.stringify(cyCustomEnv, null, 2)}

----------------------------------------------
`);

            if (isOpen) {
              await cypress.open({
                configFile: cypressConfigFilePath,
                config: {
                  e2e: {
                    baseUrl,
                  },
                  env: cyCustomEnv,
                },
              });
            } else {
              try {
                result = await cypress.run({
                  browser: 'chrome',
                  spec: filePath,
                  configFile: cypressConfigFilePath,
                  reporter: argv.reporter as string,
                  reporterOptions: argv.reporterOptions,
                  headed: argv.headed as boolean,
                  config: {
                    e2e: {
                      baseUrl,
                    },
                    numTestsKeptInMemory: 0,
                    env: cyCustomEnv,
                  },
                });
              } catch (error) {
                result = error;
              }
            }

            await procs.stop('kibana');
            await shutdownEs();
            cleanupServerPorts({ esPort, kibanaPort, fleetServerPort });

            return result;
          });
          return result;
        },
        {
          concurrency: (argv.concurrency as number | undefined)
            ? (argv.concurrency as number)
            : !isOpen
            ? 2
            : 1,
        }
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
