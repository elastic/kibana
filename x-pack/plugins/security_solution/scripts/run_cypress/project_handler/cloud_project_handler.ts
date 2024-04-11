import axios, { AxiosError } from 'axios';
import pRetry from 'p-retry';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { ToolingLog } from '@kbn/tooling-log';

const BASE_ENV_URL = `${process.env.QA_CONSOLE_URL}`;
let log: ToolingLog;

const DEFAULT_REGION = 'aws-eu-west-1';
const API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress-creds',
  'x-elastic-internal-origin': 'security-solution',
  [ELASTIC_HTTP_VERSION_HEADER]: [INITIAL_REST_VERSION],
});

const PROVIDERS = Object.freeze({
  providerType: 'basic',
  providerName: 'cloud-basic',
});

export interface ProductType {
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

export class CloudHandler {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Method to invoke the create project API for serverless.
  async createSecurityProject(
    projectName: string,
    productTypes: ProductType[],
    commit: string
  ): Promise<Project | undefined> {
    const body: CreateProjectRequestBody = {
      name: projectName,
      region_id: DEFAULT_REGION,
      product_types: productTypes,
    };

    log.info(`Kibana override flag equals to ${process.env.KIBANA_MKI_USE_LATEST_COMMIT}!`);
    if (
      (process.env.KIBANA_MKI_USE_LATEST_COMMIT &&
        process.env.KIBANA_MKI_USE_LATEST_COMMIT === '1') ||
      commit
    ) {
      const override = commit ? commit : process.env.BUILDKITE_COMMIT;
      const kibanaOverrideImage = `${override?.substring(0, 12)}`;
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
      const response = await axios.post(
        `${BASE_ENV_URL}/api/v1/serverless/projects/security`,
        body,
        {
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
          },
        }
      );
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
  async deleteSecurityProject(projectId: string, projectName: string): Promise<void> {
    try {
      await axios.delete(`${BASE_ENV_URL}/api/v1/serverless/projects/security/${projectId}`, {
        headers: {
          Authorization: `ApiKey ${this.apiKey}`,
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
  resetCredentials(projectId: string, runnerId: string): Promise<Credentials | undefined> {
    log.info(`${runnerId} : Reseting credentials`);

    const fetchResetCredentialsStatusAttempt = async (attemptNum: number) => {
      const response = await axios.post(
        `${BASE_ENV_URL}/api/v1/serverless/projects/security/${projectId}/_reset-internal-credentials`,
        {},
        {
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
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
  waitForProjectInitialized(projectId: string): Promise<void> {
    const fetchProjectStatusAttempt = async (attemptNum: number) => {
      log.info(`Retry number ${attemptNum} to check if project is initialized.`);
      const response = await axios.get(
        `${BASE_ENV_URL}/api/v1/serverless/projects/security/${projectId}/status`,
        {
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
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
  waitForEsStatusGreen(esUrl: string, auth: string, runnerId: string): Promise<void> {
    const fetchHealthStatusAttempt = async (attemptNum: number) => {
      log.info(`Retry number ${attemptNum} to check if Elasticsearch is green.`);

      const response = await axios.get(
        `${esUrl}/_cluster/health?wait_for_status=green&timeout=50s`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

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
  waitForKibanaAvailable(kbUrl: string, auth: string, runnerId: string): Promise<void> {
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
  waitForEsAccess(esUrl: string, auth: string, runnerId: string): Promise<void> {
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
  waitForKibanaLogin(kbUrl: string, credentials: Credentials): Promise<void> {
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
}
