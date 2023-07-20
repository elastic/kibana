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
      const { argv } = yargs(process.argv.slice(2));

      const isOpen = argv._[0] === 'open';
      const cypressConfigFilePath = require.resolve(`../../${argv.configFile}`) as string;
      const cypressConfigFile = await import(require.resolve(`../../${argv.configFile}`));
      const spec: string | undefined = argv?.spec as string;
      const files = retrieveIntegrations(spec ? [spec] : cypressConfigFile?.e2e?.specPattern);

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
              _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile,
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

                if (configFromTestFile?.license) {
                  vars.esTestCluster.license = configFromTestFile.license;
                }

                if (hasFleetServerArgs) {
                  vars.kbnTestServer.serverArgs.push(
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

            const customEnv = await pRetry(() => functionalTestRunner.run(abortCtrl.signal), {
              retries: 1,
            });

            if (isOpen) {
              await cypress.open({
                configFile: cypressConfigFilePath,
                config: {
                  e2e: {
                    baseUrl: `http://localhost:${kibanaPort}`,
                  },
                  env: customEnv,
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
            ? 3
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
