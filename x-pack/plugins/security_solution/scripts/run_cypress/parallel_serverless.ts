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
import axios, { AxiosError } from 'axios';
import path from 'path';
import os from 'os';
import pRetry from 'p-retry';

import { renderSummaryTable } from './print_run';
import type { SecuritySolutionDescribeBlockFtrConfig } from './utils';
import { parseTestFileConfig, retrieveIntegrations } from './utils';

interface ProductType {
  product_line: string;
  product_tier: string;
}

interface CreateEnvironmentRequestBody {
  name: string;
  region_id: string;
  product_types?: ProductType[];
}

interface Environment {
  name: string;
  id: string;
  region: string;
  es_url: string;
  kb_url: string;
  product: string;
}

interface Credentials {
  username: string;
  password: string;
}

const DEFAULT_REGION = 'aws-eu-west-1';
const PROJECT_NAME_PREFIX = 'kibana-cypress-security-solution-ephemeral';
const BASE_ENV_URL = 'https://global.qa.cld.elstc.co';
let log: ToolingLog;

const delay = async (timeout: number) => {
  await new Promise((r) => setTimeout(r, timeout));
};

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

// Method to invoke the create environment API for serverless.
async function createEnvironment(
  projectName: string,
  apiKey: string,
  ftrConfig: SecuritySolutionDescribeBlockFtrConfig
): Promise<Environment | undefined> {
  const body: CreateEnvironmentRequestBody = {
    name: projectName,
    region_id: DEFAULT_REGION,
  };

  const productTypes: ProductType[] = [];
  ftrConfig?.productTypes?.forEach((t) => {
    productTypes.push(t as ProductType);
  });
  if (productTypes.length > 0) body.product_types = productTypes;

  try {
    const response = await axios.post(`${BASE_ENV_URL}/api/v1/serverless/projects/security`, body, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
      },
    });
    return {
      name: response.data.name,
      id: response.data.id,
      region: response.data.region_id,
      es_url: `${response.data.endpoints.elasticsearch}:443`,
      kb_url: `${response.data.endpoints.kibana}:443`,
      product: response.data.type,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      log.error(`${error.response?.status}:${error.response?.data}`);
    } else {
      log.error(`${error.message}`);
    }
  }
}

// Method to invoke the delete environment API for serverless.
async function deleteEnvironment(
  projectId: string,
  projectName: string,
  apiKey: string
): Promise<void> {
  try {
    await axios.delete(`${BASE_ENV_URL}/api/v1/serverless/projects/security/${projectId}`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
      },
    });
    log.info(`Environment ${projectName} was successfully deleted!`);
  } catch (error) {
    if (error instanceof AxiosError) {
      log.error(`${error.response?.status}:${error.response?.data}`);
    } else {
      log.error(`${error.message}`);
    }
  }
}

// Method to reset the credentials for the created environment.
async function resetCredentials(
  environmentId: string,
  runnerId: string,
  apiKey: string
): Promise<Credentials | undefined> {
  log.info(`${runnerId} : Reseting credentials`);
  try {
    const response = await axios.post(
      `${BASE_ENV_URL}/api/v1/serverless/projects/security/${environmentId}/_reset-credentials`,
      {},
      {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );
    return {
      password: response.data.password,
      username: response.data.username,
    };
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

// Wait until elasticsearch status goes green
function waitForEsStatusGreen(esUrl: string, auth: string, runnerId: string): Promise<void> {
  const fetchHealthStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if es is green.`);

    const response = await axios.get(`${esUrl}/_cluster/health?wait_for_status=green&timeout=50s`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    log.info(`${runnerId}: Elasticsearch is ready with status ${response.data.status}.`);
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info(
          `${runnerId}: The elasticsearch url is not yet reachable. A retry will be triggered soon...`
        );
      }
    },
    retries: 50,
    factor: 2,
    maxTimeout: 20000,
  };

  return pRetry(fetchHealthStatusAttempt, retryOptions);
}

// Wait until Kibana is available
function waitForKibanaAvailable(kbUrl: string, auth: string, runnerId: string): Promise<void> {
  const fetchKibanaStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if kibana is available.`);
    const response = await axios.get(`${kbUrl}/api/status`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    if (response.data.status.overall.level !== 'available') {
      throw new Error(`${runnerId}: Kibana is not available. Retrying in 20s...`);
    } else {
      log.info(`${runnerId}: Kibana status overall is ${response.data.status.overall.level}.`);
    }
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info(`${runnerId}: The kibana url is not yet reachable. Retrying in 20s...`);
      } else {
        log.info(`${runnerId}: ${error}`);
      }
    },
    retries: 50,
    factor: 2,
    maxTimeout: 20000,
  };
  return pRetry(fetchKibanaStatusAttempt, retryOptions);
}

export const cli = () => {
  run(
    async () => {
      log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });

      // Checking if API key is either provided via env variable or in ~/.elastic.cloud.json
      if (!process.env.CLOUD_QA_API_KEY && !getApiKeyFromElasticCloudJsonFile()) {
        log.error('The api key for the environment needs to be provided with the env var API_KEY.');
        log.error(
          'If running locally, ~/.elastic/cloud.json is attempted to be read which contains the api key.'
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
        );

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

      const files = retrieveIntegrations(concreteFilePaths);

      log.info('Resolved spec files after retrieveIntegrations:', files);

      if (!files?.length) {
        log.info('No tests found');
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

      const results = await pMap(
        files,
        async (filePath) => {
          let result:
            | CypressCommandLine.CypressRunResult
            | CypressCommandLine.CypressFailedRunResult
            | undefined;
          await withProcRunner(log, async (procs) => {
            const id = crypto.randomBytes(8).toString('hex');
            const PROJECT_NAME = `${PROJECT_NAME_PREFIX}-${id}`;
            const specFileFTRConfig = parseTestFileConfig(filePath);

            if (!API_KEY) {
              log.info('API KEY to create environment could not be retrieved.');
              // eslint-disable-next-line no-process-exit
              return process.exit(1);
            }

            log.info(`${id}: Creating environment ${PROJECT_NAME}...`);
            // Creating environment for the test to run
            const environment = await createEnvironment(PROJECT_NAME, API_KEY, specFileFTRConfig);

            if (!environment) {
              log.info('Failed to create environment.');
              // eslint-disable-next-line no-process-exit
              return process.exit(1);
            }

            // Reset credentials for elastic user
            const credentials = await resetCredentials(environment.id, id, API_KEY);

            if (!credentials) {
              log.info('Credentials could not be reset.');
              // eslint-disable-next-line no-process-exit
              return process.exit(1);
            }

            // Wait for 8 minutes in order for the environment to be ready
            delay(480000);

            // Base64 encode the credentials in order to invoke ES and KB APIs
            const auth = btoa(`${credentials.username}:${credentials.password}`);

            // Wait for elasticsearch status to go green.
            await waitForEsStatusGreen(environment.es_url, auth, id);

            // Wait until Kibana is available
            await waitForKibanaAvailable(environment.kb_url, auth, id);

            // Normalized the set of available env vars in cypress
            const cyCustomEnv = {
              CYPRESS_BASE_URL: environment.kb_url,

              ELASTICSEARCH_URL: environment.es_url,
              ELASTICSEARCH_USERNAME: credentials.username,
              ELASTICSEARCH_PASSWORD: credentials.password,

              KIBANA_URL: environment.kb_url,
              KIBANA_USERNAME: credentials.username,
              KIBANA_PASSWORD: credentials.password,

              CLOUD_SERVERLESS: true,
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

            if (isOpen) {
              await cypress.open({
                configFile: cypressConfigFilePath,
                config: {
                  e2e: {
                    baseUrl: environment.kb_url,
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
                      baseUrl: environment.kb_url,
                    },
                    numTestsKeptInMemory: 0,
                    env: cyCustomEnv,
                  },
                });
              } catch (error) {
                result = error;
              }
            }

            // Delete serverless environment
            log.info(`${id} : Deleting Environment ${PROJECT_NAME}...`);
            await deleteEnvironment(environment.id, PROJECT_NAME, API_KEY);

            return result;
          });
          return result;
        },
        {
          concurrency: PARALLEL_COUNT,
        }
      );

      if (results) {
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
      }
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
