/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_BULK_GET_SOURCES } from '../../../../../common/constants';
import { KibanaServices } from '../../../../common/lib/kibana';
import { renderQuery } from '../../../../management/hooks/test_utils';
import { useBulkGetRulesSources } from './use_bulk_get_sources';

const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('useBulkGetRulesSources', () => {
  const fetchMockResult = {};

  beforeEach(() => {
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(fetchMockResult);
  });

  it('should call "bulk get source" route with query', async () => {
    await renderQuery(() => useBulkGetRulesSources({ query: 'query all rules' }), 'isSuccess');

    expect(fetchMock).toHaveBeenCalledWith(
      DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'query all rules' }),
      })
    );
  });

  it('should call "bulk get source" route with ids', async () => {
    await renderQuery(() => useBulkGetRulesSources({ ids: ['rule1', 'rule3'] }), 'isSuccess');

    expect(fetchMock).toHaveBeenCalledWith(
      DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['rule1', 'rule3'] }),
      })
    );
  });
});
