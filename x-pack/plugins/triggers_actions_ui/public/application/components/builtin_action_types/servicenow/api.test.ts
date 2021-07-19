/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import { getChoices } from './api';

const choicesResponse = {
  status: 'ok',
  data: [
    {
      dependent_value: '',
      label: '1 - Critical',
      value: '1',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '2 - High',
      value: '2',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '3 - Moderate',
      value: '3',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '4 - Low',
      value: '4',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '5 - Planning',
      value: '5',
      element: 'priority',
    },
  ],
};

describe('ServiceNow API', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => jest.resetAllMocks());

  describe('getChoices', () => {
    test('should call get choices API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(choicesResponse);
      const res = await getChoices({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
        fields: ['priority'],
      });

      expect(res).toEqual(choicesResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"getChoices","subActionParams":{"fields":["priority"]}}}',
        signal: abortCtrl.signal,
      });
    });
  });
});
