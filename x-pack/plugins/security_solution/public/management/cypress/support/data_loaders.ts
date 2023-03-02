/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import type { CasePostRequest } from '@kbn/cases-plugin/common/api';
import type {
  IndexedEndpointRuleAlerts,
  DeletedIndexedEndpointRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import type { IndexedHostsAndAlertsResponse } from '../../../../common/endpoint/index_data';
import type {
  DeletedIndexedCase,
  IndexedCase,
} from '../../../../common/endpoint/data_loaders/index_case';
import { createRuntimeServices } from '../../../../scripts/endpoint/common/stack_services';
import type {
  DeleteIndexedFleetEndpointPoliciesResponse,
  IndexedFleetEndpointPolicyResponse,
} from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  indexFleetEndpointPolicy,
  deleteIndexedFleetEndpointPolicies,
} from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { deleteIndexedCase, indexCase } from '../../../../common/endpoint/data_loaders/index_case';
import type { DeleteIndexedEndpointHostsResponse } from '../../../../common/endpoint/data_loaders/index_endpoint_hosts';
import { cyLoadEndpointDataHandler } from './plugin_handlers/endpoint_data_loader';
import { deleteIndexedHostsAndAlerts } from '../../../../common/endpoint/index_data';
import {
  deleteIndexedEndpointRuleAlerts,
  indexEndpointRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      task(
        name: 'indexFleetEndpointPolicy',
        arg: {
          policyName: string;
          endpointPackageVersion: string;
        },
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<IndexedFleetEndpointPolicyResponse>;

      task(
        name: 'deleteIndexedFleetEndpointPolicies',
        arg: IndexedFleetEndpointPolicyResponse,
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<DeleteIndexedFleetEndpointPoliciesResponse>;

      task(
        name: 'indexCase',
        arg?: Partial<CasePostRequest>,
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<IndexedCase['data']>;

      task(
        name: 'deleteIndexedCase',
        arg: IndexedCase['data'],
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<DeletedIndexedCase>;

      task(
        name: 'indexEndpointHosts',
        arg?: { count?: number },
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<IndexedHostsAndAlertsResponse>;

      task(
        name: 'deleteIndexedEndpointHosts',
        arg: IndexedHostsAndAlertsResponse,
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<DeleteIndexedEndpointHostsResponse>;

      task(
        name: 'indexEndpointRuleAlerts',
        arg?: { endpointAgentId: string; count?: number },
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<IndexedEndpointRuleAlerts['alerts']>;

      task(
        name: 'deleteIndexedEndpointRuleAlerts',
        arg: IndexedEndpointRuleAlerts['alerts'],
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<DeletedIndexedEndpointRuleAlerts>;
    }
  }
}

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
    }: {
      policyName: string;
      endpointPackageVersion: string;
    }) => {
      const { kbnClient } = await stackServicesPromise;
      return indexFleetEndpointPolicy(kbnClient, policyName, endpointPackageVersion);
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

    indexEndpointHosts: async (options: { count?: number }) => {
      const { kbnClient, esClient } = await stackServicesPromise;
      return cyLoadEndpointDataHandler(esClient, kbnClient, {
        numHosts: options.count,
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
  });
};
