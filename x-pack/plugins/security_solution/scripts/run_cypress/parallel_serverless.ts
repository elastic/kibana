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
import grep from '@cypress/grep/src/plugin';
import crypto from 'crypto';
import fs from 'fs';
import { createFailError } from '@kbn/dev-cli-errors';
import path from 'path';
import os from 'os';

import { exec } from 'child_process';
import { renderSummaryTable } from './print_run';
import { parseTestFileConfig, retrieveIntegrations } from './utils';

import { ProductType, CloudHandler } from './project_handler/cloud_project_handler';

const BASE_ENV_URL = `${process.env.QA_CONSOLE_URL}`;
const PROJECT_NAME_PREFIX = 'kibana-cypress-security-solution-ephemeral';
// const PROXY_URL = `${process.env.PROXY_URL}`;

let log: ToolingLog;

const getApiKeyFromElasticCloudJsonFile = (): string | undefined => {
  const userHomeDir = os.homedir();
  try {
    const jsonString = fs.readFileSync(path.join(userHomeDir, '.elastic/cloud.json'), 'utf-8');
    const jsonData = JSON.parse(jsonString);
    return jsonData.api_key.qa;
  } catch (e) {
    log.info('API KEY could not be found in .elastic/cloud.json');
  }
};

const DEFAULT_CONFIGURATION: Readonly<ProductType[]> = [
  { product_line: 'security', product_tier: 'complete' },
  { product_line: 'cloud', product_tier: 'complete' },
  { product_line: 'endpoint', product_tier: 'complete' },
] as const;

const getProductTypes = (
  tier: string,
  endpointAddon: boolean,
  cloudAddon: boolean
): ProductType[] => {
  let productTypes: ProductType[] = [...DEFAULT_CONFIGURATION];

  if (tier) {
    productTypes = productTypes.map((product) => ({
      ...product,
      product_tier: tier,
    }));
  }
  if (!cloudAddon) {
    productTypes = productTypes.filter((product) => product.product_line !== 'cloud');
  }
  if (!endpointAddon) {
    productTypes = productTypes.filter((product) => product.product_line !== 'endpoint');
  }

  return productTypes;
};

export const cli = () => {
  run(
    async (context) => {
      log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });

      // Checking if API key is either provided via env variable or in ~/.elastic.cloud.json
      if (!process.env.CLOUD_QA_API_KEY && !getApiKeyFromElasticCloudJsonFile()) {
        log.error('The API key for the environment needs to be provided with the env var API_KEY.');
        log.error(
          'If running locally, ~/.elastic/cloud.json is attempted to be read which contains the API key.'
        );
        // eslint-disable-next-line no-process-exit
        return process.exit(1);
      }

      const API_KEY = process.env.CLOUD_QA_API_KEY
        ? process.env.CLOUD_QA_API_KEY
        : getApiKeyFromElasticCloudJsonFile();

      const PARALLEL_COUNT = process.env.PARALLEL_COUNT ? Number(process.env.PARALLEL_COUNT) : 1;

      if (!process.env.CLOUD_ENV) {
        log.warning(
          'The cloud environment to be provided with the env var CLOUD_ENV. Currently working only for QA so the script can proceed.'
        );
        // Abort when more environments will be integrated

        // return process.exit(0);
      }

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
        .option('tier', {
          alias: 't',
          type: 'string',
          default: 'complete',
        })
        .option('endpointAddon', {
          alias: 'ea',
          type: 'boolean',
          default: true,
        })
        .option('cloudAddon', {
          alias: 'ca',
          type: 'boolean',
          default: true,
        })
        .option('commit', {
          alias: 'c',
          type: 'string',
          default: '',
        });

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
      // KIBANA_MKI_USE_LATEST_COMMIT === 1 means that we are overriding the image for the periodic pipeline execution.
      // We don't override the image when executing the tests on the second quality gate.
      if (
        !process.env.KIBANA_MKI_USE_LATEST_COMMIT ||
        process.env.KIBANA_MKI_USE_LATEST_COMMIT !== '1'
      ) {
        cypressConfigFile.env.grepTags = '@serverlessQA --@skipInServerless';
      }
      const tier: string = argv.tier;
      const endpointAddon: boolean = argv.endpointAddon;
      const cloudAddon: boolean = argv.cloudAddon;
      const commit: string = argv.commit;

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

      const files = retrieveIntegrations(concreteFilePaths);

      log.info('Resolved spec files after retrieveIntegrations:', files);

      if (!files?.length) {
        log.info('No tests found');
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

      const failedSpecFilePaths: string[] = [];
      let cloudHandler: CloudHandler;
      if (API_KEY) {
        cloudHandler = new CloudHandler(API_KEY);
      }
      const runSpecs = (filePaths: string[]) =>
        pMap(
          filePaths,
          async (filePath) => {
            let result:
              | CypressCommandLine.CypressRunResult
              | CypressCommandLine.CypressFailedRunResult
              | undefined;
            await withProcRunner(log, async (procs) => {
              const id = crypto.randomBytes(8).toString('hex');
              const PROJECT_NAME = `${PROJECT_NAME_PREFIX}-${id}`;

              const productTypes = isOpen
                ? getProductTypes(tier, endpointAddon, cloudAddon)
                : (parseTestFileConfig(filePath).productTypes as ProductType[]);

              if (!API_KEY) {
                log.info('API KEY to create project could not be retrieved.');
                // eslint-disable-next-line no-process-exit
                return process.exit(1);
              }

              log.info(`${id}: Creating project ${PROJECT_NAME}...`);
              // Creating project for the test to run
              const project = await cloudHandler.createSecurityProject(
                PROJECT_NAME,
                productTypes,
                commit
              );

              if (!project) {
                log.info('Failed to create project.');
                // eslint-disable-next-line no-process-exit
                return process.exit(1);
              }

              context.addCleanupTask(() => {
                const command = `curl -X DELETE ${BASE_ENV_URL}/api/v1/serverless/projects/security/${project.id} -H "Authorization: ApiKey ${API_KEY}"`;
                exec(command);
              });

              // Reset credentials for elastic user
              const credentials = await cloudHandler.resetCredentials(project.id, id);

              if (!credentials) {
                log.info('Credentials could not be reset.');
                // eslint-disable-next-line no-process-exit
                return process.exit(1);
              }

              // Wait for project to be initialized
              await cloudHandler.waitForProjectInitialized(project.id);

              // Base64 encode the credentials in order to invoke ES and KB APIs
              const auth = btoa(`${credentials.username}:${credentials.password}`);

              // Wait for elasticsearch status to go green.
              await cloudHandler.waitForEsStatusGreen(project.es_url, auth, id);

              // Wait until Kibana is available
              await cloudHandler.waitForKibanaAvailable(project.kb_url, auth, id);

              // Wait for Elasticsearch to be accessible
              await cloudHandler.waitForEsAccess(project.es_url, auth, id);

              // Wait until application is ready
              await cloudHandler.waitForKibanaLogin(project.kb_url, credentials);

              // Normalized the set of available env vars in cypress
              const cyCustomEnv = {
                CYPRESS_BASE_URL: project.kb_url,

                ELASTICSEARCH_URL: project.es_url,
                ELASTICSEARCH_USERNAME: credentials.username,
                ELASTICSEARCH_PASSWORD: credentials.password,

                KIBANA_URL: project.kb_url,
                KIBANA_USERNAME: credentials.username,
                KIBANA_PASSWORD: credentials.password,

                // Both CLOUD_SERVERLESS and IS_SERVERLESS are used by the cypress tests.
                CLOUD_SERVERLESS: true,
                IS_SERVERLESS: true,
                // TEST_CLOUD is used by SvlUserManagerProvider to define if testing against cloud.
                TEST_CLOUD: 1,
              };

              if (process.env.DEBUG && !process.env.CI) {
                log.info(`
              ----------------------------------------------
              Cypress run ENV for file: ${filePath}:
              ----------------------------------------------
              ${JSON.stringify(cyCustomEnv, null, 2)}
              ----------------------------------------------
              `);
              }
              process.env.TEST_CLOUD_HOST_NAME = new URL(BASE_ENV_URL).hostname;

              if (isOpen) {
                await cypress.open({
                  configFile: cypressConfigFilePath,
                  config: {
                    e2e: {
                      baseUrl: project.kb_url,
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
                        baseUrl: project.kb_url,
                      },
                      numTestsKeptInMemory: 0,
                      env: cyCustomEnv,
                    },
                  });
                  if ((result as CypressCommandLine.CypressRunResult)?.totalFailed) {
                    failedSpecFilePaths.push(filePath);
                  }
                  // Delete serverless project
                  log.info(`${id} : Deleting project ${PROJECT_NAME}...`);
                  await cloudHandler.deleteSecurityProject(project.id, PROJECT_NAME);
                } catch (error) {
                  // False positive
                  // eslint-disable-next-line require-atomic-updates
                  result = error;
                  failedSpecFilePaths.push(filePath);
                }
              }
              return result;
            });
            return result;
          },
          {
            concurrency: PARALLEL_COUNT,
          }
        );

      const initialResults = await runSpecs(files);
      // If there are failed tests, retry them
      const retryResults = await runSpecs([...failedSpecFilePaths]);

      renderSummaryTable([
        // Don't include failed specs from initial run in results
        ..._.filter(
          initialResults,
          (initialResult: CypressCommandLine.CypressRunResult) =>
            initialResult?.runs &&
            _.some(
              initialResult?.runs,
              (runResult) => !failedSpecFilePaths.includes(runResult.spec.absolute)
            )
        ),
        ...retryResults,
      ] as CypressCommandLine.CypressRunResult[]);
      const hasFailedTests = (
        runResults: Array<
          | CypressCommandLine.CypressFailedRunResult
          | CypressCommandLine.CypressRunResult
          | undefined
        >
      ) =>
        _.some(
          // only fail the job if retry failed as well
          runResults,
          (runResult) =>
            (runResult as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
            (runResult as CypressCommandLine.CypressRunResult)?.totalFailed
        );

      const hasFailedInitialTests = hasFailedTests(initialResults);
      const hasFailedRetryTests = hasFailedTests(retryResults);

      // If the initialResults had failures and failedSpecFilePaths was not populated properly return errors
      if (hasFailedRetryTests || (hasFailedInitialTests && !retryResults.length)) {
        throw createFailError('Not all tests passed');
      }
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
