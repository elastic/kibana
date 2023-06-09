/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CasePostRequest } from '@kbn/cases-plugin/common/api';
import type { DeleteAllEndpointDataResponse } from '../../../scripts/endpoint/common/delete_all_endpoint_data';
import type { IndexedEndpointPolicyResponse } from '../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import type {
  HostPolicyResponse,
  LogsEndpointActionResponse,
} from '../../../common/endpoint/types';
import type { IndexEndpointHostsCyTaskOptions, HostActionResponse } from './types';
import type {
  DeleteIndexedFleetEndpointPoliciesResponse,
  IndexedFleetEndpointPolicyResponse,
} from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type {
  DeletedIndexedCase,
  IndexedCase,
} from '../../../common/endpoint/data_loaders/index_case';
import type { IndexedHostsAndAlertsResponse } from '../../../common/endpoint/index_data';
import type { DeleteIndexedEndpointHostsResponse } from '../../../common/endpoint/data_loaders/index_endpoint_hosts';
import type {
  DeletedIndexedEndpointRuleAlerts,
  IndexedEndpointRuleAlerts,
} from '../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      /**
       * Get Elements by `data-test-subj`
       * @param args
       */
      getByTestSubj<E extends Node = HTMLElement>(
        ...args: Parameters<Cypress.Chainable<E>['get']>
      ): Chainable<JQuery<E>>;

      /**
       * Finds elements by `data-test-subj` from within another. Can not be used directly from `cy`.
       *
       * @example
       * // Correct:
       * cy.get('someElement').findByTestSubj('some-subject);
       *
       * // Incorrect:
       * cy.findByTestSubj('some-subject);
       */
      findByTestSubj<E extends Node = HTMLElement>(
        ...args: Parameters<Cypress.Chainable<E>['find']>
      ): Chainable<JQuery<E>>;

      /**
       * Continuously call provided callback function until it either return `true`
       * or fail if `timeout` is reached.
       * @param fn
       * @param options
       */
      waitUntil(
        fn: (subject?: any) => boolean | Promise<boolean> | Chainable<boolean>,
        options?: Partial<{
          interval: number;
          timeout: number;
        }>
      ): Chainable<Subject>;

      task(
        name: 'indexFleetEndpointPolicy',
        arg: {
          policyName: string;
          endpointPackageVersion: string;
        },
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<IndexedFleetEndpointPolicyResponse>;

      task(
        name: 'deleteIndexedFleetEndpointPolicies',
        arg: IndexedFleetEndpointPolicyResponse,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<DeleteIndexedFleetEndpointPoliciesResponse>;

      task(
        name: 'indexCase',
        arg?: Partial<CasePostRequest>,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<IndexedCase['data']>;

      task(
        name: 'deleteIndexedCase',
        arg: IndexedCase['data'],
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<DeletedIndexedCase>;

      task(
        name: 'indexEndpointHosts',
        arg?: IndexEndpointHostsCyTaskOptions,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<IndexedHostsAndAlertsResponse>;

      task(
        name: 'deleteIndexedEndpointHosts',
        arg: IndexedHostsAndAlertsResponse,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<DeleteIndexedEndpointHostsResponse>;

      task(
        name: 'indexEndpointRuleAlerts',
        arg?: { endpointAgentId: string; count?: number },
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<IndexedEndpointRuleAlerts['alerts']>;

      task(
        name: 'deleteIndexedEndpointRuleAlerts',
        arg: IndexedEndpointRuleAlerts['alerts'],
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<DeletedIndexedEndpointRuleAlerts>;

      task(
        name: 'indexEndpointPolicyResponse',
        arg: HostPolicyResponse,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<IndexedEndpointPolicyResponse>;

      task(
        name: 'deleteIndexedEndpointPolicyResponse',
        arg: IndexedEndpointPolicyResponse,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<null>;

      task(
        name: 'sendHostActionResponse',
        arg: HostActionResponse,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<LogsEndpointActionResponse>;

      task(
        name: 'deleteAllEndpointData',
        arg: { endpointAgentIds: string[] },
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<DeleteAllEndpointDataResponse>;

      task(
        name: 'createFileOnEndpoint',
        arg: { hostname: string; path: string; content: string },
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<null>;

      task(
        name: 'uploadFileToEndpoint',
        arg: { hostname: string; srcPath: string; destPath: string },
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<null>;

      task(
        name: 'installPackagesOnEndpoint',
        arg: { hostname: string; packages: string[] },
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<null>;

      task(
        name: 'readZippedFileContentOnEndpoint',
        arg: { hostname: string; path: string; password?: string },
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<string>;
    }
  }
}
