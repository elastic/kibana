/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sendGetDatasource, sendGetEndpointSpecificDatasources } from './ingest';
import { httpServiceMock } from '../../../../../../../../../src/core/public/mocks';
import { DATASOURCE_SAVED_OBJECT_TYPE } from '../../../../../../../ingest_manager/common';

describe('ingest service', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  describe('sendGetEndpointSpecificDatasources()', () => {
    it('auto adds kuery to api request', async () => {
      await sendGetEndpointSpecificDatasources(http);
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources', {
        query: {
          kuery: `${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        },
      });
    });
    it('supports additional KQL to be defined on input for query params', async () => {
      await sendGetEndpointSpecificDatasources(http, {
        query: { kuery: 'someValueHere', page: 1, perPage: 10 },
      });
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources', {
        query: {
          kuery: `someValueHere and ${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          perPage: 10,
          page: 1,
        },
      });
    });
  });
  describe('sendGetDatasource()', () => {
    it('builds correct API path', async () => {
      await sendGetDatasource(http, '123');
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources/123', undefined);
    });
    it('supports http options', async () => {
      await sendGetDatasource(http, '123', { query: { page: 1 } });
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources/123', {
        query: {
          page: 1,
        },
      });
    });
  });
});
