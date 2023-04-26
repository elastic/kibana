/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import type { CasePostRequest } from '@kbn/cases-plugin/common/api';
import { sendEndpointActionResponse } from '../../../../scripts/endpoint/agent_emulator/services/endpoint_response_actions';
import type { DeleteAllEndpointDataResponse } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import { deleteAllEndpointData } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import { waitForEndpointToStreamData } from '../../../../scripts/endpoint/common/endpoint_metadata_services';
import type {
  CreateAndEnrollEndpointHostOptions,
  CreateAndEnrollEndpointHostResponse,
} from '../../../../scripts/endpoint/common/endpoint_host_services';
import type { IndexedEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import {
  deleteIndexedEndpointPolicyResponse,
  indexEndpointPolicyResponse,
} from '../../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import type {
  ActionDetails,
  HostPolicyResponse,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import type { IndexEndpointHostsCyTaskOptions } from '../types';
import type {
  IndexedEndpointRuleAlerts,
  DeletedIndexedEndpointRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import type { IndexedHostsAndAlertsResponse } from '../../../../common/endpoint/index_data';
import type { IndexedCase } from '../../../../common/endpoint/data_loaders/index_case';
import { createRuntimeServices } from '../../../../scripts/endpoint/common/stack_services';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  indexFleetEndpointPolicy,
  deleteIndexedFleetEndpointPolicies,
} from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { deleteIndexedCase, indexCase } from '../../../../common/endpoint/data_loaders/index_case';
import { cyLoadEndpointDataHandler } from './plugin_handlers/endpoint_data_loader';
import { deleteIndexedHostsAndAlerts } from '../../../../common/endpoint/index_data';
import {
  deleteIndexedEndpointRuleAlerts,
  indexEndpointRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import {
  createAndEnrollEndpointHost,
  destroyEndpointHost,
} from '../../../../scripts/endpoint/common/endpoint_host_services';

/**
 * Cypress plugin for adding data loading related `task`s
 *
 * @param on
 * @param config
 *
 * @see https://docs.cypress.io/api/plugins/writing-a-plugin
 */
export const dataLoaders = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  // FIXME: investigate if we can create a `ToolingLog` that writes output to cypress and pass that to the stack services

  const stackServicesPromise = createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
    asSuperuser: true,
  });

  on('task', {
    indexFleetEndpointPolicy: async ({
      policyName,
      endpointPackageVersion,
      agentPolicyName,
    }: {
      policyName: string;
      endpointPackageVersion: string;
      agentPolicyName?: string;
    }) => {
      const { kbnClient } = await stackServicesPromise;
      return indexFleetEndpointPolicy(
        kbnClient,
        policyName,
        endpointPackageVersion,
        agentPolicyName
      );
    },

    deleteIndexedFleetEndpointPolicies: async (indexData: IndexedFleetEndpointPolicyResponse) => {
      const { kbnClient } = await stackServicesPromise;
      return deleteIndexedFleetEndpointPolicies(kbnClient, indexData);
    },

    indexCase: async (newCase: Partial<CasePostRequest> = {}): Promise<IndexedCase['data']> => {
      const { kbnClient } = await stackServicesPromise;
      const response = await indexCase(kbnClient, newCase);
      return response.data;
    },

    deleteIndexedCase: async (data: IndexedCase['data']): Promise<null> => {
      const { kbnClient } = await stackServicesPromise;
      await deleteIndexedCase(kbnClient, data);
      return null;
    },

    indexEndpointHosts: async (options: IndexEndpointHostsCyTaskOptions = {}) => {
      const { kbnClient, esClient } = await stackServicesPromise;
      const { count: numHosts, version, os, isolation, withResponseActions } = options;

      return cyLoadEndpointDataHandler(esClient, kbnClient, {
        numHosts,
        version,
        os,
        isolation,
        withResponseActions,
      });
    },

    deleteIndexedEndpointHosts: async (indexedData: IndexedHostsAndAlertsResponse) => {
      const { kbnClient, esClient } = await stackServicesPromise;
      return deleteIndexedHostsAndAlerts(esClient, kbnClient, indexedData);
    },

    indexEndpointRuleAlerts: async (options: { endpointAgentId: string; count?: number }) => {
      const { esClient, log } = await stackServicesPromise;
      return (
        await indexEndpointRuleAlerts({
          ...options,
          esClient,
          log,
        })
      ).alerts;
    },

    deleteIndexedEndpointRuleAlerts: async (
      data: IndexedEndpointRuleAlerts['alerts']
    ): Promise<DeletedIndexedEndpointRuleAlerts> => {
      const { esClient, log } = await stackServicesPromise;
      return deleteIndexedEndpointRuleAlerts(esClient, data, log);
    },

    indexEndpointPolicyResponse: async (
      policyResponse: HostPolicyResponse
    ): Promise<IndexedEndpointPolicyResponse> => {
      const { esClient } = await stackServicesPromise;
      return indexEndpointPolicyResponse(esClient, policyResponse);
    },

    deleteIndexedEndpointPolicyResponse: async (
      indexedData: IndexedEndpointPolicyResponse
    ): Promise<null> => {
      const { esClient } = await stackServicesPromise;
      return deleteIndexedEndpointPolicyResponse(esClient, indexedData).then(() => null);
    },

    sendHostActionResponse: async (data: {
      action: ActionDetails;
      state: { state?: 'success' | 'failure' };
    }): Promise<LogsEndpointActionResponse> => {
      const { esClient } = await stackServicesPromise;
      return sendEndpointActionResponse(esClient, data.action, { state: data.state.state });
    },

    deleteAllEndpointData: async ({
      endpointAgentIds,
    }: {
      endpointAgentIds: string[];
    }): Promise<DeleteAllEndpointDataResponse> => {
      const { esClient } = await stackServicesPromise;
      return deleteAllEndpointData(esClient, endpointAgentIds);
    },
  });
};

export const dataLoadersForRealEndpoints = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  const stackServicesPromise = createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
    asSuperuser: true,
  });

  on('task', {
    createEndpointHost: async (
      options: Omit<CreateAndEnrollEndpointHostOptions, 'log' | 'kbnClient'>
    ): Promise<CreateAndEnrollEndpointHostResponse> => {
      const { kbnClient, log } = await stackServicesPromise;
      return createAndEnrollEndpointHost({ ...options, log, kbnClient }).then((newHost) => {
        return waitForEndpointToStreamData(kbnClient, newHost.agentId, 120000).then(() => {
          return newHost;
        });
      });
    },

    destroyEndpointHost: async (
      createdHost: CreateAndEnrollEndpointHostResponse
    ): Promise<null> => {
      const { kbnClient } = await stackServicesPromise;
      return destroyEndpointHost(kbnClient, createdHost).then(() => null);
    },
  });
};
