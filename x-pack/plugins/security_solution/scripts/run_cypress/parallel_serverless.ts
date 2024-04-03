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

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { exec } from 'child_process';
import { renderSummaryTable } from './print_run';
import { parseTestFileConfig, retrieveIntegrations } from './utils';

interface ProductType {
  product_line: string;
  product_tier: string;
}

interface OverrideEntry {
  docker_image: string;
}

interface ProductOverrides {
  kibana?: OverrideEntry;
  elasticsearch?: OverrideEntry;
  fleet?: OverrideEntry;
  cluster?: OverrideEntry;
}

interface CreateProjectRequestBody {
  name: string;
  region_id: string;
  product_types?: ProductType[];
  overrides?: ProductOverrides;
}

interface Project {
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

const DEFAULT_CONFIGURATION: Readonly<ProductType[]> = [
  { product_line: 'security', product_tier: 'complete' },
  { product_line: 'cloud', product_tier: 'complete' },
  { product_line: 'endpoint', product_tier: 'complete' },
] as const;

const DEFAULT_REGION = 'aws-eu-west-1';
const PROJECT_NAME_PREFIX = 'kibana-cypress-security-solution-ephemeral';
const BASE_ENV_URL = `${process.env.QA_CONSOLE_URL}`;
let log: ToolingLog;
const API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress-creds',
  'x-elastic-internal-origin': 'security-solution',
  [ELASTIC_HTTP_VERSION_HEADER]: [INITIAL_REST_VERSION],
});
const PROVIDERS = Object.freeze({
  providerType: 'basic',
  providerName: 'cloud-basic',
});

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

// Method to invoke the create project API for serverless.
async function createSecurityProject(
  projectName: string,
  apiKey: string,
  productTypes: ProductType[]
): Promise<Project | undefined> {
  const body: CreateProjectRequestBody = {
    name: projectName,
    region_id: DEFAULT_REGION,
    product_types: productTypes,
  };

  log.info(`Kibana override flag equals to ${process.env.KIBANA_MKI_USE_LATEST_COMMIT}!`);
  if (
    process.env.KIBANA_MKI_USE_LATEST_COMMIT &&
    process.env.KIBANA_MKI_USE_LATEST_COMMIT === '1'
  ) {
    const kibanaOverrideImage = `${process.env.BUILDKITE_COMMIT?.substring(0, 12)}`;
    log.info(
      `Overriding Kibana image in the MKI with docker.elastic.co/kibana-ci/kibana-serverless:sec-sol-qg-${kibanaOverrideImage}`
    );
    body.overrides = {
      kibana: {
        docker_image: `docker.elastic.co/kibana-ci/kibana-serverless:sec-sol-qg-${kibanaOverrideImage}`,
      },
    };
  }

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
      const errorData = JSON.stringify(error.response?.data);
      log.error(`${error.response?.status}:${errorData}`);
    } else {
      log.error(`${error.message}`);
    }
  }
}

// Method to invoke the delete project API for serverless.
async function deleteSecurityProject(
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
    log.info(`Project ${projectName} was successfully deleted!`);
  } catch (error) {
    if (error instanceof AxiosError) {
      log.error(`${error.response?.status}:${error.response?.data}`);
    } else {
      log.error(`${error.message}`);
    }
  }
}

// Method to reset the credentials for the created project.
async function resetCredentials(
  projectId: string,
  runnerId: string,
  apiKey: string
): Promise<Credentials | undefined> {
  log.info(`${runnerId} : Reseting credentials`);

  const fetchResetCredentialsStatusAttempt = async (attemptNum: number) => {
    const response = await axios.post(
      `${BASE_ENV_URL}/api/v1/serverless/projects/security/${projectId}/_reset-internal-credentials`,
      {},
      {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );
    log.info('Credentials have ben reset');
    return {
      password: response.data.password,
      username: response.data.username,
    };
  };

  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info('Project is not reachable. A retry will be triggered soon..');
      } else {
        log.error(`${error.message}`);
      }
    },
    retries: 100,
    factor: 2,
    maxTimeout: 20000,
  };

  return pRetry(fetchResetCredentialsStatusAttempt, retryOptions);
}

// Wait until Project is initialized
function waitForProjectInitialized(projectId: string, apiKey: string): Promise<void> {
  const fetchProjectStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if project is initialized.`);
    const response = await axios.get(
      `${BASE_ENV_URL}/api/v1/serverless/projects/security/${projectId}/status`,
      {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );
    if (response.data.phase !== 'initialized') {
      log.info(response.data);
      throw new Error('Project is not initialized. A retry will be triggered soon...');
    } else {
      log.info('Project is initialized');
    }
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info('Project is not reachable. A retry will be triggered soon...');
      } else {
        log.error(`${error.message}`);
      }
    },
    retries: 100,
    factor: 2,
    maxTimeout: 20000,
  };
  return pRetry(fetchProjectStatusAttempt, retryOptions);
}

// Wait until elasticsearch status goes green
function waitForEsStatusGreen(esUrl: string, auth: string, runnerId: string): Promise<void> {
  const fetchHealthStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if Elasticsearch is green.`);

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
          `${runnerId}: The Elasticsearch URL is not yet reachable. A retry will be triggered soon...`
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
      throw new Error(`${runnerId}: Kibana is not available. A retry will be triggered soon...`);
    } else {
      log.info(`${runnerId}: Kibana status overall is ${response.data.status.overall.level}.`);
    }
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info(
          `${runnerId}: The Kibana URL is not yet reachable. A retry will be triggered soon...`
        );
      } else {
        log.info(`${runnerId}: ${error.message}`);
      }
    },
    retries: 50,
    factor: 2,
    maxTimeout: 20000,
  };
  return pRetry(fetchKibanaStatusAttempt, retryOptions);
}

// Wait for Elasticsearch to be accessible
function waitForEsAccess(esUrl: string, auth: string, runnerId: string): Promise<void> {
  const fetchEsAccessAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if can be accessed.`);

    await axios.get(`${esUrl}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info(
          `${runnerId}: The elasticsearch url is not yet reachable. A retry will be triggered soon...`
        );
      }
    },
    retries: 100,
    factor: 2,
    maxTimeout: 20000,
  };

  return pRetry(fetchEsAccessAttempt, retryOptions);
}

// Wait until application is ready
function waitForKibanaLogin(kbUrl: string, credentials: Credentials): Promise<void> {
  const body = {
    ...PROVIDERS,
    currentURL: '/',
    params: credentials,
  };

  const fetchLoginStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if login can be performed.`);
    axios.post(`${kbUrl}/internal/security/login`, body, {
      headers: API_HEADERS,
    });
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info('Project is not reachable. A retry will be triggered soon...');
      } else {
        log.error(`${error.message}`);
      }
    },
    retries: 100,
    factor: 2,
    maxTimeout: 20000,
  };
  return pRetry(fetchLoginStatusAttempt, retryOptions);
}

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

      const tier: string = argv.tier;
      const endpointAddon: boolean = argv.endpointAddon;
      const cloudAddon: boolean = argv.cloudAddon;

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
              const project = await createSecurityProject(PROJECT_NAME, API_KEY, productTypes);

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
              const credentials = await resetCredentials(project.id, id, API_KEY);

              if (!credentials) {
                log.info('Credentials could not be reset.');
                // eslint-disable-next-line no-process-exit
                return process.exit(1);
              }

              // Wait for project to be initialized
              await waitForProjectInitialized(project.id, API_KEY);

              // Base64 encode the credentials in order to invoke ES and KB APIs
              const auth = btoa(`${credentials.username}:${credentials.password}`);

              // Wait for elasticsearch status to go green.
              await waitForEsStatusGreen(project.es_url, auth, id);

              // Wait until Kibana is available
              await waitForKibanaAvailable(project.kb_url, auth, id);

              // Wait for Elasticsearch to be accessible
              await waitForEsAccess(project.es_url, auth, id);

              // Wait until application is ready
              await waitForKibanaLogin(project.kb_url, credentials);

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
                  await deleteSecurityProject(project.id, PROJECT_NAME, API_KEY);
                } catch (error) {
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
          (result) =>
            (result as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
            (result as CypressCommandLine.CypressRunResult)?.totalFailed
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
