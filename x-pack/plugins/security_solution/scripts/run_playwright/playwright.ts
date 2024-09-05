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
import { withProcRunner } from '@kbn/dev-proc-runner';
import path from 'path';
import fs from 'fs';

import { EsVersion, FunctionalTestRunner, runElasticsearch, runKibanaServer } from '@kbn/test';

import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';
import pRetry from 'p-retry';
import execa from 'execa';
import { prefixedOutputLogger } from '../endpoint/common/utils';
import { createToolingLogger } from '../../common/endpoint/data_loaders/utils';
import { parseTestFileConfig, retrieveIntegrations } from '../run_cypress/utils';
import { getFTRConfig } from '../run_cypress/get_ftr_config';
import type { StartedFleetServer } from '../endpoint/common/fleet_server/fleet_server_services';
import { startFleetServer } from '../endpoint/common/fleet_server/fleet_server_services';
import { createKbnClient } from '../endpoint/common/stack_services';

export const cli = () => {
  run(
    async ({ log: _cliLogger }) => {
      const { argv } = yargs(process.argv.slice(2))
        .coerce('configFile', (arg) => (_.isArray(arg) ? _.last(arg) : arg))
        .coerce('spec', (arg) => (_.isArray(arg) ? _.last(arg) : arg))
        .coerce('env', (arg: string) =>
          arg.split(',').reduce((acc, curr) => {
            const [key, value] = curr.split('=');
            if (key === 'burn') {
              acc[key] = parseInt(value, 10);
            } else {
              acc[key] = value;
            }
            return acc;
          }, {} as Record<string, string | number>)
        )
        .boolean('inspect');

      _cliLogger.info(`
----------------------------------------------
Script arguments:
----------------------------------------------
${JSON.stringify(argv, null, 2)}
----------------------------------------------
`);

      const isOpen = argv._.includes('open');
      const playwrightConfigFilePath = require.resolve(`../../${argv.configFile}`) as string;
      const playwrightConfigFile = await import(playwrightConfigFilePath);

      const log = prefixedOutputLogger('playwright', createToolingLogger());

      log.info(`
----------------------------------------------
Playwright config for file: ${playwrightConfigFilePath}:
----------------------------------------------
${JSON.stringify(playwrightConfigFile, null, 2)}
----------------------------------------------


`);

      const specConfig = playwrightConfigFile.testMatch;
      const specArg = argv.spec;
      const specPattern = specArg ?? specConfig;
      const files = retrieveIntegrations(globby.sync(specPattern));
      const esPorts: number[] = [9200, 9220];
      const kibanaPorts: number[] = [5601, 5620];
      const fleetServerPorts: number[] = [8220];

      const getEsPort = <T>(): T | number => {
        if (isOpen) {
          return 9220;
        }

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

      const failedSpecFilePaths: string[] = [];

      const runSpecs = async (filePaths: string[]) =>
        pMap(
          filePaths,
          async (filePath) => {
            let result: Error | undefined;
            await withProcRunner(log, async (procs) => {
              const abortCtrl = new AbortController();

              const onEarlyExit = (msg: string) => {
                log.error(msg);
                abortCtrl.abort();
              };

              const esPort: number = getEsPort();
              const kibanaPort: number = getKibanaPort();
              const fleetServerPort: number = getFleetServerPort();

              const specFileFTRConfig = parseTestFileConfig(filePath);
              const ftrConfigFilePath = path.resolve(
                _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile
              );

              const config = await getFTRConfig({
                log,
                esPort,
                kibanaPort,
                fleetServerPort,
                ftrConfigFilePath,
                specFilePath: filePath,
                specFileFTRConfig,
                isOpen,
              });

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
              let fleetServer: StartedFleetServer | undefined;
              let shutdownEs;

              try {
                shutdownEs = await pRetry(
                  async () =>
                    runElasticsearch({
                      config,
                      log,
                      name: `ftr-${esPort}`,
                      esFrom: config.get('esTestCluster')?.from || 'snapshot',
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
                      : ['--dev', '--no-dev-credentials'],
                  onEarlyExit,
                  inspect: argv.inspect,
                });

                if (playwrightConfigFile.env?.WITH_FLEET_SERVER) {
                  log.info(`Setting up fleet-server for this Cypress config`);

                  const kbnClient = createKbnClient({
                    url: baseUrl,
                    username: config.get('servers.kibana.username'),
                    password: config.get('servers.kibana.password'),
                    log,
                  });

                  fleetServer = await pRetry(
                    async () =>
                      startFleetServer({
                        kbnClient,
                        logger: log,
                        port:
                          fleetServerPort ?? config.has('servers.fleetserver.port')
                            ? (config.get('servers.fleetserver.port') as number)
                            : undefined,
                        // `force` is needed to ensure that any currently running fleet server (perhaps left
                        // over from an interrupted run) is killed and a new one restarted
                        force: true,
                      }),
                    { retries: 2, forever: false }
                  );
                }

                await providers.loadAll();
                const functionalTestRunner = new FunctionalTestRunner(
                  log,
                  config,
                  EsVersion.getDefault()
                );
                const ftrEnv = await pRetry(() => functionalTestRunner.run(abortCtrl.signal), {
                  retries: 1,
                });

                // Normalized the set of available env vars in Playwright
                const playwrightCustomEnv = {
                  ...ftrEnv,
                  // NOTE:
                  // ELASTICSEARCH_URL needs to be created here with auth because SIEM Playwright setup depends on it. At some
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
                  IS_SERVERLESS: config.get('serverless'),
                };

                const envFilePath = path.resolve(
                  __dirname,
                  '..',
                  '..',
                  '..',
                  '..',
                  'test',
                  'security_solution_playwright',
                  '.env'
                );

                const envContent = Object.entries(playwrightCustomEnv)
                  .map(([key, value]) => `${key}=${value}`)
                  .join('\n');

                fs.writeFileSync(envFilePath, envContent);

                log.info(`
                ----------------------------------------------
                Playwright run ENV for file: ${filePath}
                ----------------------------------------------
                `);

                const project = playwrightCustomEnv.IS_SERVERLESS ? 'serverless' : 'ess';

                if (isOpen) {
                  await execa.command(
                    `../../../node_modules/.bin/playwright test --config ${playwrightConfigFilePath} --ui --project ${project}`,
                    {
                      env: {
                        ...playwrightCustomEnv,
                      },
                      stdout: process.stdout,
                    }
                  );
                } else {
                  await execa.command(
                    `../../../node_modules/.bin/playwright test --config ${playwrightConfigFilePath} --project ${project} --grep @${project}`,
                    {
                      env: {
                        ...playwrightCustomEnv,
                        FILE_PATH: filePath,
                      },
                      stdout: process.stdout,
                    }
                  );
                }
              } catch (error) {
                log.error(error);
                result = error;
                failedSpecFilePaths.push(filePath);
              }

              if (fleetServer) {
                await fleetServer.stop();
              }

              await procs.stop('kibana');
              await shutdownEs?.();
              cleanupServerPorts({ esPort, kibanaPort, fleetServerPort });
              return result;
            });
            return result;
          },
          {
            concurrency: 1,
          }
        );

      await runSpecs(files);
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
