/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { useBulkUntrackAlertsByQuery } from './use_bulk_untrack_alerts_by_query';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { TriggersAndActionsUiServices } from '../../../..';

const mockUseKibanaReturnValue: TriggersAndActionsUiServices = createStartServicesMock();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

const response = {};

describe('useBulkUntrackAlertsByQuery', () => {
  const httpMock = mockUseKibanaReturnValue.http.post as jest.Mock;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer(AlertsQueryContext);
  });

  it('calls the api when invoked with the correct parameters', async () => {
    httpMock.mockResolvedValue(response);

    const { result, waitFor } = renderHook(() => useBulkUntrackAlertsByQuery(), {
      wrapper: appMockRender.AppWrapper,
    });

    await act(async () => {
      // @ts-expect-error: no need to specify a query
      await result.current.mutateAsync({ ruleTypeIds: ['foo'], query: [] });
    });

    await waitFor(() => {
      expect(httpMock).toHaveBeenCalledWith('/internal/alerting/alerts/_bulk_untrack_by_query', {
        body: '{"query":[],"rule_type_ids":["foo"]}',
      });
    });
  });
});
