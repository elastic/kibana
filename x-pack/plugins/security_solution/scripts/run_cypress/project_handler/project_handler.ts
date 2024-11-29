/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

export interface ProductType {
  product_line: string;
  product_tier: string;
}

export interface OverrideEntry {
  docker_image: string;
}

export interface ProductOverrides {
  kibana?: OverrideEntry;
  elasticsearch?: OverrideEntry;
  fleet?: OverrideEntry;
  cluster?: OverrideEntry;
}

export interface CreateProjectRequestBody {
  name: string;
  region_id: string;
  product_types?: ProductType[];
  overrides?: ProductOverrides;
}

export interface Project {
  name: string;
  id: string;
  region: string;
  es_url: string;
  kb_url: string;
  product: string;
  proxy_id?: number;
  proxy_org_id?: number;
  proxy_org_name?: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export class ProjectHandler {
  private readonly DEFAULT_ERROR_MSG: string =
    'The method needs to be overriden when the class is inherited!';

  baseEnvUrl: string;
  log: ToolingLog;

  constructor(baseEnvUrl: string) {
    this.baseEnvUrl = baseEnvUrl;
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
  }

  // Method to invoke the create project API for serverless.
  async createSecurityProject(
    projectName: string,
    productTypes?: ProductType[],
    commit?: string
  ): Promise<Project | undefined> {
    throw new Error(this.DEFAULT_ERROR_MSG);
  }

  async deleteSecurityProject(projectId: string, projectName: string): Promise<void> {
    throw new Error(this.DEFAULT_ERROR_MSG);
  }

  resetCredentials(projectId: string): Promise<Credentials | undefined> {
    throw new Error(this.DEFAULT_ERROR_MSG);
  }

  waitForProjectInitialized(projectId: string): Promise<void> {
    throw new Error(this.DEFAULT_ERROR_MSG);
  }
}
