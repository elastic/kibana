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
import path from 'path';
import grep from '@cypress/grep/src/plugin';

import { EsVersion, FunctionalTestRunner, runElasticsearch, runKibanaServer } from '@kbn/test';

import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';

import { createFailError } from '@kbn/dev-cli-errors';
import pRetry from 'p-retry';
import { renderSummaryTable } from './print_run';
import { parseTestFileConfig, retrieveIntegrations } from './utils';
import { getFTRConfig } from './get_ftr_config';

export const cli = () => {
  run(
    async () => {
      const log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });

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

      log.info(`
----------------------------------------------
Script arguments:
----------------------------------------------

${JSON.stringify(argv, null, 2)}

----------------------------------------------
`);

      const isOpen = argv._.includes('open');

      const cypressConfigFilePath = require.resolve(`../../${argv.configFile}`) as string;
      const cypressConfigFile = await import(cypressConfigFilePath);

      log.info(`
----------------------------------------------
Cypress config for file: ${cypressConfigFilePath}:
----------------------------------------------

${JSON.stringify(cypressConfigFile, null, 2)}

----------------------------------------------
`);

      const specConfig = cypressConfigFile.e2e.specPattern;
      const specArg = argv.spec;
      const specPattern = specArg ?? specConfig;

      log.info('Config spec pattern:', specConfig);
      log.info('Arguments spec pattern:', specArg);
      log.info('Resulting spec pattern:', specPattern);

      // The grep function will filter Cypress specs by tags: it will include and exclude
      // spec files according to the tags configuration.
      const grepSpecPattern = grep({
        ...cypressConfigFile,
        specPattern,
        excludeSpecPattern: [],
      }).specPattern;

      log.info('Resolved spec files or pattern after grep:', grepSpecPattern);

      const isGrepReturnedFilePaths = _.isArray(grepSpecPattern);
      const isGrepReturnedSpecPattern = !isGrepReturnedFilePaths && grepSpecPattern === specPattern;
      const grepFilterSpecs = cypressConfigFile.env?.grepFilterSpecs;

      // IMPORTANT!
      // When grep returns the same spec pattern as it gets in its arguments, we treat it as
      // it couldn't find any concrete specs to execute (maybe because all of them are skipped).
      // In this case, we do an early return - it's important to do that.
      // If we don't return early, these specs will start executing, and Cypress will be skipping
      // tests at runtime: those that should be excluded according to the tags passed in the config.
      // This can take so much time that the job can fail by timeout in CI.
      if (grepFilterSpecs && isGrepReturnedSpecPattern) {
        log.info('No tests found - all tests could have been skipped via Cypress tags');
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

      const concreteFilePaths = isGrepReturnedFilePaths
        ? grepSpecPattern // use the returned concrete file paths
        : globby.sync(specPattern); // convert the glob pattern to concrete file paths

      let files = retrieveIntegrations(concreteFilePaths);

      log.info('Resolved spec files after retrieveIntegrations:', files);

      if (argv.changedSpecsOnly) {
        files = (findChangedFiles('main', false) as string[]).reduce((acc, itemPath) => {
          const existing = files.find((grepFilePath) => grepFilePath.includes(itemPath));
          if (existing) {
            acc.push(existing);
          }
          return acc;
        }, [] as string[]);

        // to avoid running too many tests, we limit the number of files to 3
        // we may extend this in the future
        files = files.slice(0, 3);
      }

      if (!files?.length) {
        log.info('No tests found');
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

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

            log.info(`
----------------------------------------------
Cypress FTR setup for file: ${filePath}:
----------------------------------------------

${JSON.stringify(
  config.getAll(),
  (key, v) => {
    if (Array.isArray(v) && v.length > 32) {
      return v.slice(0, 32).concat('... trimmed after 32 items.');
    } else {
      return v;
    }
  },
  2
)}

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
                  : ['--dev', '--no-dev-config', '--no-dev-credentials'],
              onEarlyExit,
              inspect: argv.inspect,
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

              IS_SERVERLESS: config.get('serverless'),

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
                  browser: 'electron',
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
          concurrency: 1,
        }
      ).then((results) => {
        renderSummaryTable(results as CypressCommandLine.CypressRunResult[]);
        const hasFailedTests = _.some(
          results,
          (result) =>
            (result as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
            (result as CypressCommandLine.CypressRunResult)?.totalFailed
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
