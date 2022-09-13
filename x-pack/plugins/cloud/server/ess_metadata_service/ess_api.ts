/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { URL } from 'url';
import fetch, { type RequestInit } from 'node-fetch';

/**
 * Configuration to set up the ESS API client
 */
export interface EssApiConfiguration {
  /**
   * The base host to use when performing the HTTP requests.
   */
  host: string;
  /**
   * Auth details
   */
  auth: {
    /**
     * The API Key obtained from ESS.
     */
    api_key: string;
  };
}

/**
 * The response to the Get Deployment by ID request.
 * @remark Extracted from the OpenAPI specification (https://cloud.elastic.co/api/v1/api-docs/spec.json)
 */
export interface EssGetDeployment {
  /**
   * A randomly-generated id of this Deployment
   */
  id: string;
  /**
   * The name of this deployment
   */
  name: string;
  /**
   * A user-defined deployment alias for user-friendly resource URLs
   */
  alias?: string;
  /**
   * Whether the deployment is overall healthy or not (one or more of the resource info subsections will have healthy: false)
   */
  healthy: boolean;
  /**
   * The Resources that belong to this Deployment
   */
  resources: {}; // we'll define it when needed
  /**
   * Additional configuration for this Deployment
   */
  settings?: {}; // we'll define it when needed
  /**
   * The observability information for this deployment
   */
  observability?: {}; // we'll define it when needed
  /**
   * Additional information about this deployment
   */
  metadata?: {
    /**
     * @deprecated Deployments should be owned by organizations, not users. Use organization_id instead.
     */
    owner_id?: string;
    /**
     * The ESS Organization owning this deployment.
     */
    organization_id?: string;
    system_owned?: boolean;
    hidden?: boolean;
    last_modified?: string;
    last_resource_plan_modified?: string;
    /**
     * Arbitrary user-defined metadata associated with this deployment
     */
    tags?: Array<{
      /**
       * The metadata field name
       */
      key: string;
      /**
       * The metadata value
       */
      value: string;
    }>;
  };
}

/**
 * The response to the Get Organization by ID request.
 * @remark Extracted from the OpenAPI specification (https://cloud.elastic.co/api/v1/api-docs/spec.json)
 */
export interface EssGetOrganization {
  /**
   * The organization's identifier.
   */
  id: string;
  /**
   * The organization's friendly name.
   */
  name: string;
  /**
   * `true` if the organization is in trial on Cloud.
   * `false` when it's a paying customer.
   */
  in_trial?: boolean;
  /**
   * `true` if the organization is owned by an Elastician.
   */
  is_elastic_staff_organization?: boolean;
}

export class EssApi {
  constructor(private readonly config: EssApiConfiguration) {}

  /**
   * Retrieves information about a Deployment.
   * @param deploymentId Identifier for the Deployment
   */
  public async getDeploymentById(deploymentId: string): Promise<EssGetDeployment> {
    return await this.makeRequest<EssGetDeployment>(`/api/v1/deployments/${deploymentId}`);
  }

  /**
   * Retrieves information about a Deployment.
   * @param organizationId Identifier for the Deployment
   */
  public async getOrganizationById(organizationId: string): Promise<EssGetOrganization> {
    return await this.makeRequest<EssGetOrganization>(`/api/v1/organizations/${organizationId}`);
  }

  private async makeRequest<Data>(endpoint: string, opts: RequestInit = {}): Promise<Data> {
    const url = new URL(endpoint, this.config.host);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...opts.headers,
        authorization: `ApiKey ${this.config.auth.api_key}`,
      },
      ...opts,
    });

    if (!response.ok) {
      throw new Error(`${response.status} - ${await response.text()}`);
    }

    return await response.json();
  }
}
