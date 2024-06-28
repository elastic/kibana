/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError } from 'axios';
import pRetry from 'p-retry';
import type {
  ProductType,
  Project,
  CreateProjectRequestBody,
  Credentials,
} from './project_handler';
import { ProjectHandler } from './project_handler';

const DEFAULT_REGION = 'aws-eu-west-1';

export class ProxyHandler extends ProjectHandler {
  proxyAuth: string;

  constructor(baseEnvUrl: string, proxyClientId: string, proxySecret: string) {
    super(baseEnvUrl);
    this.proxyAuth = btoa(`${proxyClientId}:${proxySecret}`);
  }

  // Method to invoke the create project API for serverless.
  async createSecurityProject(
    projectName: string,
    productTypes?: ProductType[],
    commit?: string
  ): Promise<Project | undefined> {
    const body: CreateProjectRequestBody = {
      name: projectName,
      region_id: DEFAULT_REGION,
    };

    if (productTypes) {
      body.product_types = productTypes;
    }

    if (process.env.KIBANA_MKI_IMAGE_COMMIT || commit) {
      const override = commit ? commit : process.env.KIBANA_MKI_IMAGE_COMMIT;
      const kibanaOverrideImage = `${override?.substring(0, 12)}`;
      this.log.info(`Kibana Image Commit under test: ${process.env.KIBANA_MKI_IMAGE_COMMIT}!`);
      this.log.info(
        `Overriding Kibana image in the MKI with docker.elastic.co/kibana-ci/kibana-serverless:git-${kibanaOverrideImage}`
      );
      body.overrides = {
        kibana: {
          docker_image: `docker.elastic.co/kibana-ci/kibana-serverless:git-${kibanaOverrideImage}`,
        },
      };
    }

    try {
      const response = await axios.post(`${this.baseEnvUrl}/projects`, body, {
        headers: {
          Authorization: `Basic ${this.proxyAuth}`,
        },
      });
      return {
        name: response.data.name,
        id: response.data.project_id,
        region: response.data.region_id,
        es_url: `${response.data.elasticsearch_endpoint}:443`,
        kb_url: `${response.data.kibana_endpoint}:443`,
        product: response.data.project_type,
        proxy_id: response.data.id,
        proxy_org_id: response.data.organization_id,
        proxy_org_name: response.data.organization_name,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorData = JSON.stringify(error.response?.data);
        this.log.error(`${error.response?.status}:${errorData}`);
      } else {
        this.log.error(`${error.message}`);
      }
    }
  }

  // Method to invoke the delete project API for serverless.
  async deleteSecurityProject(projectId: string, projectName: string): Promise<void> {
    try {
      await axios.delete(`${this.baseEnvUrl}/projects/${projectId}`, {
        headers: {
          Authorization: `Basic ${this.proxyAuth}`,
        },
      });
      this.log.info(`Project ${projectName} was successfully deleted!`);
    } catch (error) {
      if (error instanceof AxiosError) {
        this.log.error(`${error.response?.status}:${error.response?.data}`);
      } else {
        this.log.error(`${error.message}`);
      }
    }
  }

  // Method to reset the credentials for the created project.
  resetCredentials(projectId: string, runnerId: string): Promise<Credentials | undefined> {
    this.log.info(`${runnerId} : Reseting credentials`);

    const fetchResetCredentialsStatusAttempt = async (attemptNum: number) => {
      const response = await axios.post(
        `${this.baseEnvUrl}/projects/${projectId}/_reset-internal-credentials`,
        {},
        {
          headers: {
            Authorization: `Basic ${this.proxyAuth}`,
          },
        }
      );
      this.log.info('Credentials have ben reset');
      return {
        password: response.data.password,
        username: response.data.username,
      };
    };

    const retryOptions = {
      onFailedAttempt: (error: Error | AxiosError) => {
        if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
          this.log.info('Project is not reachable. A retry will be triggered soon..');
        } else {
          this.log.error(`${error.message}`);
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
      this.log.info(`Retry number ${attemptNum} to check if project is initialized.`);
      const response = await axios.get(`${this.baseEnvUrl}/projects/${projectId}/status`, {
        headers: {
          Authorization: `Basic ${this.proxyAuth}`,
        },
      });
      if (response.data.phase !== 'initialized') {
        this.log.info(response.data);
        throw new Error('Project is not initialized. A retry will be triggered soon...');
      } else {
        this.log.info('Project is initialized');
      }
    };
    const retryOptions = {
      onFailedAttempt: (error: Error | AxiosError) => {
        if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
          this.log.info('Project is not reachable. A retry will be triggered soon...');
        } else {
          this.log.error(`${error.message}`);
        }
      },
      retries: 100,
      factor: 2,
      maxTimeout: 20000,
    };
    return pRetry(fetchProjectStatusAttempt, retryOptions);
  }
}
