/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, PackagePolicy } from '@kbn/fleet-plugin/common';
import { AgentPolicyServiceInterface, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { fetchConnectors } from '@kbn/search-connectors';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';

export interface ConnectorMetadata {
  id: string;
  name: string;
  service_type: string;
}

export interface PackagePolicyMetadata {
  packagePolicyId: string;
  agentPolicyIds: string[];
  connectorMetadata: ConnectorMetadata;
}

const connectorsInputName = 'connectors-py';
const pkgName = 'elastic_connectors';

export class AgentlessConnectorsInfraService {
  private logger: Logger;
  private soClient: SavedObjectsClientContract;
  private esClient: ElasticsearchClient;
  private packagePolicyService: PackagePolicyClient;
  private agentPolicyService: AgentPolicyServiceInterface;

  constructor(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicyService: PackagePolicyClient,
    agentPolicyService: AgentPolicyServiceInterface,
    logger: Logger
  ) {
    this.logger = logger;
    this.soClient = soClient;
    this.esClient = esClient;
    this.packagePolicyService = packagePolicyService;
    this.agentPolicyService = agentPolicyService;
  }

  public getNativeConnectors = async (): Promise<ConnectorMetadata[]> => {
    this.logger.debug(`Fetching all connectors and filtering only to native`);
    const nativeConnectors: ConnectorMetadata[] = [];
    const allConnectors = await fetchConnectors(this.esClient);
    for (const connector of allConnectors) {
      if (connector.is_native && connector.service_type != null) {
        nativeConnectors.push({
          id: connector.id,
          name: connector.name,
          service_type: connector.service_type,
        });
      }
    }
    return nativeConnectors;
  };

  public getConnectorPackagePolicies = async (): Promise<PackagePolicyMetadata[]> => {
    const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`;
    this.logger.debug(`Fetching policies with kuery: "${kuery}"`);
    const policiesIterator = await this.packagePolicyService.fetchAllItems(this.soClient, {
      perPage: 50,
      kuery,
    });
    const policiesMetadata: PackagePolicyMetadata[] = [];
    for await (const policyPage of policiesIterator) {
      for (const policy of policyPage) {
        for (const input of policy.inputs) {
          if (input.type === connectorsInputName) {
            if (input.compiled_input != null) {
              if (input.compiled_input.service_type === null) {
                this.logger.debug(`Policy ${policy.id} is missing service_type, skipping`);
                continue;
              }

              if (input.compiled_input.connector_id === null) {
                this.logger.debug(`Policy ${policy.id} is missing connector_id, skipping`);
                continue;
              }

              if (input.compiled_input.connector_name === null) {
                this.logger.debug(`Policy ${policy.id} is missing connector_name`);
                // No need to skip, that's fine
              }

              policiesMetadata.push({
                packagePolicyId: policy.id,
                agentPolicyIds: policy.policy_ids,
                connectorMetadata: {
                  id: input.compiled_input.connector_id,
                  name: input.compiled_input.connector_name || '',
                  service_type: input.compiled_input.service_type,
                },
              });
            }
          }
        }
      }
    }

    return policiesMetadata;
  };

  public deployConnector = async (connector: ConnectorMetadata): Promise<PackagePolicy> => {
    this.logger.info(
      `Connector ${connector.id} has no integration policy associated with it, creating`
    );

    const createdPolicy = await this.agentPolicyService.create(this.soClient, this.esClient, {
      name: `${connector.service_type} connector: ${connector.id}`,
      description: 'Automatically generated',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
      is_protected: false,
      supports_agentless: true,
    });
    this.logger.info(
      `Successfully created agent policy ${createdPolicy.id} for agentless connector ${connector.id}`
    );

    this.logger.debug(`Creating a package policy for agentless connector ${connector.id}`);
    const packagePolicy = await this.packagePolicyService.create(this.soClient, this.esClient, {
      policy_ids: [createdPolicy.id],
      package: {
        title: 'Elastic Connectors',
        name: 'elastic_connectors',
        version: '0.0.4',
      },
      name: `${connector.service_type} connector ${connector.id}`,
      description: '',
      namespace: '',
      enabled: true,
      inputs: [
        {
          type: 'connectors-py',
          enabled: true,
          vars: {
            connector_id: { type: 'string', value: connector.id },
            connector_name: { type: 'string', value: connector.name },
            service_type: { type: 'string', value: connector.service_type },
          },
          streams: [],
        },
      ],
    });

    this.logger.info(
      `Successfully created package policy ${packagePolicy.id} for agentless connector ${connector.id}`
    );

    return packagePolicy;
  };

  public removeDeployment = async (policy: PackagePolicyMetadata): Promise<void> => {
    this.logger.info(`Deleting package policy ${policy.packagePolicyId}`);
    await this.packagePolicyService.delete(this.soClient, this.esClient, [policy.packagePolicyId]);

    // TODO: can we do it in one go?
    // Why not use deleteFleetServerPoliciesForPolicyId?
    for (const agentPolicyId of policy.agentPolicyIds) {
      this.logger.info(`Deleting agent policy ${agentPolicyId}`);
      await this.agentPolicyService.delete(this.soClient, this.esClient, agentPolicyId);
    }
  };
}

export const getConnectorsWithoutPolicies = (
  packagePolicies: PackagePolicyMetadata[],
  connectors: ConnectorMetadata[]
): ConnectorMetadata[] => {
  return connectors.filter(
    (x) => packagePolicies.filter((y) => y.connectorMetadata.id === x.id).length === 0
  );
};

export const getPoliciesWithoutConnectors = (
  packagePolicies: PackagePolicyMetadata[],
  connectors: ConnectorMetadata[]
): PackagePolicyMetadata[] => {
  return packagePolicies.filter(
    (x) => connectors.filter((y) => y.id === x.connectorMetadata.id).length === 0
  );
};
