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
import grep from '@cypress/grep/src/plugin';
import crypto from 'crypto';
import fs from 'fs';
import { createFailError } from '@kbn/dev-cli-errors';
import axios from 'axios';
import path from 'path';
import os from 'os';
import { renderSummaryTable } from './print_run';
import type { SecuritySolutionDescribeBlockFtrConfig } from './utils';
import { isSkipped, parseTestFileConfig } from './utils';

interface ProductType {
  product_line: string;
  product_tier: string;
}

interface CreateEnvironmentRequestBody {
  name: string;
  region_id: string;
  product_types: ProductType[];
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
let log: ToolingLog;

/**
 * Retrieve test files using a glob pattern.
 * If process.env.RUN_ALL_TESTS is true, returns all matching files, otherwise, return files that should be run by this job based on process.env.BUILDKITE_PARALLEL_JOB_COUNT and process.env.BUILDKITE_PARALLEL_JOB
 */
const retrieveIntegrations = (integrationsPaths: string[]) => {
  const nonSkippedSpecs = integrationsPaths.filter((filePath) => !isSkipped(filePath));

  if (process.env.RUN_ALL_TESTS === 'true') {
    return nonSkippedSpecs;
  } else {
    // The number of instances of this job were created
    const chunksTotal: number = process.env.BUILDKITE_PARALLEL_JOB_COUNT
      ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
      : 1;
    // An index which uniquely identifies this instance of the job
    const chunkIndex: number = process.env.BUILDKITE_PARALLEL_JOB
      ? parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10)
      : 0;

    const nonSkippedSpecsForChunk: string[] = [];

    for (let i = chunkIndex; i < nonSkippedSpecs.length; i += chunksTotal) {
      nonSkippedSpecsForChunk.push(nonSkippedSpecs[i]);
    }

    return nonSkippedSpecsForChunk;
  }
};

const encode = (str: string): string => Buffer.from(str, 'binary').toString('base64');

const getApiKeyFromElasticCloudJsonFile = () => {
  const userHomeDir = os.homedir();
  try {
    const jsonString = fs.readFileSync(path.join(userHomeDir, '.elastic/cloud.json'), 'utf-8');
    const jsonData = JSON.parse(jsonString);
    return jsonData.api_key.qa;
  } catch (e) {
    log.info('API KEY could not be found in ');
    return null;
  }
};

// Poller function that is polling every 20s, forever until function is resolved.
async function poll<T>(
  fn: () => Promise<T>,
  retries: number = 200,
  interval: number = 20000
): Promise<T> {
  return Promise.resolve()
    .then(fn)
    .catch(async function retry(err: Error): Promise<T> {
      let remainingRetries = retries;
      if (remainingRetries-- > 0) {
        remainingRetries -= 1;
        return new Promise((resolve) => setTimeout(resolve, interval)).then(fn).catch(retry);
      }
      throw err;
    });
}

// Method to invoke the create environment API for serverless.
async function createEnvironment(
  baseUrl: string,
  projectName: string,
  runnerId: string,
  apiKey: string,
  ftrConfig: SecuritySolutionDescribeBlockFtrConfig,
  onEarlyExit: (msg: string) => void
): Promise<Environment> {
  log.info(`${runnerId}: Creating environment ${projectName}...`);
  const environment = {} as Environment;
  const body = {
    name: projectName,
    region_id: DEFAULT_REGION,
  } as CreateEnvironmentRequestBody;

  const productTypes: ProductType[] = [];
  ftrConfig?.productTypes?.forEach((t) => {
    productTypes.push(t as ProductType);
  });
  if (productTypes.length > 0) body.product_types = productTypes;

  await axios
    .post(`${baseUrl}/api/v1/serverless/projects/security`, body, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    .then((response) => {
      environment.name = response.data.name;
      environment.id = response.data.id;
      environment.region = response.data.region_id;
      environment.es_url = `${response.data.endpoints.elasticsearch}:443`;
      environment.kb_url = `${response.data.endpoints.kibana}:443`;
      environment.product = response.data.type;
    })
    .catch((error) => {
      onEarlyExit(`${error.code}:${error.data}`);
    });
  return environment;
}

// Method to invoke the delete environment API for serverless.
async function deleteEnvironment(
  baseUrl: string,
  projectId: string,
  projectName: string,
  runnerId: string,
  apiKey: string,
  onEarlyExit: (msg: string) => void
) {
  await axios
    .delete(`${baseUrl}/api/v1/serverless/projects/security/${projectId}`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
      },
    })
    .then((response) => {
      log.info(`${runnerId} : Environment ${projectName} was successfully deleted...`);
    })
    .catch((error) => {
      onEarlyExit(`${error.code}:${error.data}`);
    });
}

// Method to reset the credentials for the created environment.
async function resetCredentials(
  baseUrl: string,
  environmentId: string,
  runnerId: string,
  apiKey: string
): Promise<Credentials> {
  log.info(`${runnerId} : Reseting credentials`);
  const credentials = {} as Credentials;

  await poll(async () => {
    return axios
      .post(
        `${baseUrl}/api/v1/serverless/projects/security/${environmentId}/_reset-credentials`,
        {},
        {
          headers: {
            Authorization: `ApiKey ${apiKey}`,
          },
        }
      )
      .then((response) => {
        credentials.password = response.data.password;
        credentials.username = response.data.username;
      })
      .catch((error) => {
        throw new Error(`${error.code}:${error.data}`);
      });
  });
  return credentials;
}

// Wait until elasticsearch status goes green
async function waitForEsStatusGreen(esUrl: string, auth: string, runnerId: string) {
  await poll(async () => {
    await axios
      .get(`${esUrl}/_cluster/health?wait_for_status=green&timeout=50s`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
      .then((response) => {
        log.info(`${runnerId}: Elasticsearch is ready with status ${response.data.status}.`);
      })
      .catch((error) => {
        if (error.code === 'ENOTFOUND') {
          log.info(`${runnerId}: The elasticsearch url is not yet reachable. Retrying in 20s...`);
        }
        throw new Error(`${runnerId} - ${error.code}:${error.data}`);
      });
  });
}

// Wait until Kibana is available
async function waitForKibanaAvailable(kbUrl: string, auth: string, runnerId: string) {
  await poll(async () => {
    await axios
      .get(`${kbUrl}/api/status`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
      .then((response) => {
        if (response.data.status.overall.level !== 'available') {
          log.info(`${runnerId}: Kibana is not available. Retrying in 20s...`);
          throw new Error(`${runnerId}: Kibana is not available. Retrying in 20s...`);
        }
      })
      .catch((error) => {
        if (error.code === 'ENOTFOUND') {
          log.info(`${runnerId}: The kibana url is not yet reachable. Retrying in 20s...`);
        }
        throw new Error(`${runnerId} - ${error.code}:${error.data}`);
      });
  });
}

export const cli = () => {
  run(
    async () => {
      log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });

      const PROJECT_NAME_PREFIX = 'kibana-cypress-security-solution-ephemeral';
      const QA_BASE_ENV_URL = 'https://global.qa.cld.elstc.co';

      // Checking if API key is either provided via env variable or in ~/.elastic.cloud.json
      if (!process.env.CLOUD_QA_API_KEY && !getApiKeyFromElasticCloudJsonFile()) {
        log.error('The api key for the environment needs to be provided with the env var API_KEY.');
        log.error(
          'If running locally, ~/.elastic/cloud.json is attempted to be read which contains the api key.'
        );
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

      const API_KEY = process.env.CLOUD_QA_API_KEY
        ? process.env.CLOUD_QA_API_KEY
        : getApiKeyFromElasticCloudJsonFile();

      const PARALLEL_COUNT = process.env.PARALLEL_COUNT ? Number(process.env.PARALLEL_COUNT) : 1;

      const BASE_ENV_URL = QA_BASE_ENV_URL;
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
            const id = crypto.randomBytes(8).toString('hex');
            const PROJECT_NAME = `${PROJECT_NAME_PREFIX}-${id}`;
            const specFileFTRConfig = parseTestFileConfig(filePath);

            // Creating environment for the test to run
            const environment = await createEnvironment(
              BASE_ENV_URL,
              PROJECT_NAME,
              id,
              API_KEY,
              specFileFTRConfig,
              onEarlyExit
            );

            // Reset credentials for elastic user
            const credentials = await resetCredentials(BASE_ENV_URL, environment.id, id, API_KEY);

            // Base64 encode the credentials in order to invoke ES and KB APIs
            const auth = encode(`${credentials.username}:${credentials.password}`);

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
            await deleteEnvironment(
              BASE_ENV_URL,
              environment.id,
              PROJECT_NAME,
              id,
              API_KEY,
              onEarlyExit
            );

            return result;
          });
          return result;
        },
        {
          concurrency: PARALLEL_COUNT,
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
