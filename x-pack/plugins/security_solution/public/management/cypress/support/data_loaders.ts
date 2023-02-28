/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import type { CasePostRequest } from '@kbn/cases-plugin/common/api';
import type { IndexedCase } from '../../../../common/endpoint/data_loaders/index_case';
import { createKbnClient } from '../../../../scripts/endpoint/common/stack_services';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  indexFleetEndpointPolicy,
  deleteIndexedFleetEndpointPolicies,
} from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { indexCase } from '../../../../common/endpoint/data_loaders/index_case';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      task<S = IndexedCase>(
        name: 'indexCase',
        arg?: Partial<CasePostRequest>,
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable>
      ): Cypress.Chainable<S>;
    }
  }
}

export const dataLoaders = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  const kbnClient = createKbnClient({
    url: config.env.KIBANA_URL,
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
  });

  on('task', {
    indexFleetEndpointPolicy: async ({
      policyName,
      endpointPackageVersion,
    }: {
      policyName: string;
      endpointPackageVersion: string;
    }) => {
      return indexFleetEndpointPolicy(kbnClient, policyName, endpointPackageVersion);
    },
    deleteIndexedFleetEndpointPolicies: async (indexData: IndexedFleetEndpointPolicyResponse) => {
      return deleteIndexedFleetEndpointPolicies(kbnClient, indexData);
    },

    indexCase: (newCase: Partial<CasePostRequest> = {}): Promise<IndexedCase> => {
      return indexCase(kbnClient, newCase);
    },
  });
};
