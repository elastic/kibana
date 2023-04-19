/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ENDPOINT_ALERTS_INDEX } from '../../../../scripts/endpoint/common/constants';
import { request } from './common';
const ES_URL = Cypress.env('ELASTICSEARCH_URL');

/**
 * Continuously check for any alert to have been received by the given endpoint
 */
export const waitForEndpointAlerts = (
  endpointAgentId: string,
  additionalFilters?: object[],
  timeout = 120000
) => {
  return (
    cy
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

        //
      })
      // 3. wait until the Detection alert shows up in the API
      .then(() => {
        //
      })
  );
};
