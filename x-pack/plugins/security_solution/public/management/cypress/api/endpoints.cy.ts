/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostInfo } from '../../../../common/endpoint/types';
import {
  ISOLATE_HOST_ROUTE_V2,
  HOST_METADATA_LIST_ROUTE,
} from '../../../../common/endpoint/constants';
import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { getPlatinumLicense, getGoldLicense } from '../fixtures/licenses';
import { loadEndpointIfNoneExist } from '../tasks/load_endpoint_data';
import { getEndpointListPath } from '../../common/routing';

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.analyst_hunter);
  cy.visit(`/app/security${url}`);
};

describe('Endpoint list', () => {
  before(() => {
    login();
    loadEndpointIfNoneExist();
  });

  describe('Platinum license', () => {
    beforeEach(() => {
      setupLicense(getPlatinumLicense());
    });

    it('should allow isolating endpoint', () => {
      loginWithWriteAccess(getEndpointListPath({ name: 'endpointList' }));
      cy.request('GET', HOST_METADATA_LIST_ROUTE)
        .then((metadataResponse) => {
          const endpointIds = metadataResponse.body.data.map(
            (endpoint: HostInfo) => endpoint.metadata.agent.id
          );
          cy.request({
            method: 'POST',
            url: ISOLATE_HOST_ROUTE_V2,
            headers: { 'kbn-xsrf': 'kibana' },
            body: {
              endpoint_ids: [endpointIds[0]],
              comment: 'Isolating from Cypress with Platinum license',
            },
          });
        })
        .then((isolateResp) => {
          expect(isolateResp.status).to.eq(200);
        });
    });
  });

  describe('Gold license', () => {
    beforeEach(() => {
      setupLicense(getGoldLicense());
    });

    it('should not allow isolating endpoint', () => {
      loginWithWriteAccess(getEndpointListPath({ name: 'endpointList' }));
      cy.request('GET', HOST_METADATA_LIST_ROUTE)
        .then((metadataResponse) => {
          const endpointIds = metadataResponse.body.data.map(
            (endpoint: HostInfo) => endpoint.metadata.agent.id
          );
          cy.request({
            method: 'POST',
            url: ISOLATE_HOST_ROUTE_V2,
            headers: { 'kbn-xsrf': 'kibana' },
            body: {
              endpoint_ids: [endpointIds[0]],
              comment: 'Isolating from Cypress with Gold license',
            },
            failOnStatusCode: false,
          });
        })
        .then((isolateResp) => {
          expect(isolateResp.status).to.eq(403);
          expect(isolateResp.body).to.have.property('error', 'Forbidden');
          expect(isolateResp.body).to.have.property('message', 'Endpoint authorization failure');
        });
    });
  });
});
