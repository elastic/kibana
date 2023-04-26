/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../common/constants';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../common';
import { request } from './common';
import { ENDPOINT_ALERTS_INDEX } from '../../../../scripts/endpoint/common/constants';
const ES_URL = Cypress.env('ELASTICSEARCH_URL');

/**
 * Continuously check for any alert to have been received by the given endpoint.
 *
 * NOTE:  This is tno the same as the alerts that populate the Alerts list. To check for
 *        those types of alerts, use `waitForDetectionAlerts()`
 */
export const waitForEndpointAlerts = (
  endpointAgentId: string,
  additionalFilters?: object[],
  timeout = 120000
): Cypress.Chainable => {
  return cy
    .waitUntil(
      () => {
        return request<estypes.SearchResponse>({
          method: 'GET',
          url: `${ES_URL}/${ENDPOINT_ALERTS_INDEX}/_search`,
          body: {
            query: {
              match: {
                'agent.id': endpointAgentId,
              },
            },
            size: 1,
            _source: false,
          },
        }).then(({ body: streamedAlerts }) => {
          return (streamedAlerts.hits.total as estypes.SearchTotalHits).value > 0;
        });
      },
      { timeout }
    )
    .then(() => {
      // Stop/start Endpoint rule so that it can pickup and create Detection alerts
      cy.log(
        `Received endpoint alerts for agent [${endpointAgentId}] in index [${ENDPOINT_ALERTS_INDEX}]`
      );

      return stopStartEndpointDetectionsRule();
    })
    .then(() => {
      // wait until the Detection alert shows up in the API
      return waitForDetectionAlerts(getEndpointDetectionAlertsQueryForAgentId(endpointAgentId));
    });
};

export const fetchEndpointSecurityDetectionRule = (): Cypress.Chainable<Rule> => {
  return request<Rule>({
    method: 'GET',
    url: DETECTION_ENGINE_RULES_URL,
    qs: {
      rule_id: ELASTIC_SECURITY_RULE_ID,
    },
  }).then(({ body }) => {
    return body;
  });
};

export const stopStartEndpointDetectionsRule = (): Cypress.Chainable<Rule> => {
  return fetchEndpointSecurityDetectionRule()
    .then((endpointRule) => {
      // Disabled it
      return request({
        method: 'POST',
        url: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          action: 'disable',
          ids: [endpointRule.id],
        },
      }).then(() => {
        return endpointRule;
      });
    })
    .then((endpointRule) => {
      cy.log(`Endpoint rule id [${endpointRule.id}] has been disabled`);

      // Re-enable it
      return request({
        method: 'POST',
        url: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          action: 'enable',
          ids: [endpointRule.id],
        },
      }).then(() => endpointRule);
    })
    .then((endpointRule) => {
      cy.log(`Endpoint rule id [${endpointRule.id}] has been re-enabled`);
      return cy.wrap(endpointRule);
    });
};

/**
 * Waits for alerts to have been loaded by continuously calling the detections engine alerts
 * api until data shows up
 * @param query
 * @param timeout
 */
export const waitForDetectionAlerts = (
  /** The ES query. Defaults to `{ match_all: {} }` */
  query: object = { match_all: {} },
  timeout?: number
): Cypress.Chainable => {
  return cy.waitUntil(
    () => {
      return request<estypes.SearchResponse>({
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        body: {
          query,
          size: 1,
        },
      }).then(({ body: alertsResponse }) => {
        return Boolean((alertsResponse.hits.total as estypes.SearchTotalHits)?.value ?? 0);
      });
    },
    { timeout }
  );
};

/**
 * Builds and returns the ES `query` object for use in querying for Endpoint Detection Engine
 * alerts. Can be used in ES searches or with the Detection Engine query signals (alerts) url.
 * @param endpointAgentId
 */
export const getEndpointDetectionAlertsQueryForAgentId = (endpointAgentId: string) => {
  return {
    bool: {
      filter: [
        {
          bool: {
            should: [{ match_phrase: { 'agent.type': 'endpoint' } }],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [{ match_phrase: { 'agent.id': endpointAgentId } }],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [{ exists: { field: 'kibana.alert.rule.uuid' } }],
            minimum_should_match: 1,
          },
        },
      ],
    },
  };
};
