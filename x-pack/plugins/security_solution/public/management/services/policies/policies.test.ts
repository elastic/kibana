/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../fleet/common';
import { PACKAGE_POLICY_API_ROUTES } from '../../../../../fleet/common/constants/routes';
import { sendGetEndpointSpecificPackagePolicies } from './policies';

describe('ingest service', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  describe('sendGetEndpointSpecificPackagePolicies()', () => {
    it('auto adds kuery to api request', async () => {
      await sendGetEndpointSpecificPackagePolicies(http);
      expect(http.get).toHaveBeenCalledWith(`${PACKAGE_POLICY_API_ROUTES.LIST_PATTERN}`, {
        query: {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        },
      });
    });
    it('supports additional KQL to be defined on input for query params', async () => {
      await sendGetEndpointSpecificPackagePolicies(http, {
        query: { kuery: 'someValueHere', page: 1, perPage: 10 },
      });
      expect(http.get).toHaveBeenCalledWith(`${PACKAGE_POLICY_API_ROUTES.LIST_PATTERN}`, {
        query: {
          kuery: `someValueHere and ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          perPage: 10,
          page: 1,
        },
      });
    });
  });
});
