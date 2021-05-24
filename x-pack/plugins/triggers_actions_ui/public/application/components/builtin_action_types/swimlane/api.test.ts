/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import { getApplication } from './api';

const getActionsResponse = {
  status: 'ok',
  data: { fields: [] },
  actionId: 'te/st',
};

describe('Swimlane API', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => jest.resetAllMocks());

  describe('getApplication', () => {
    test('should call getApplication API correctly', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(getActionsResponse);
      const res = await getApplication({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
      });

      expect(res).toEqual(getActionsResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"getApplication","subActionParams":{}}}',
        signal: abortCtrl.signal,
      });
    });
  });
});
