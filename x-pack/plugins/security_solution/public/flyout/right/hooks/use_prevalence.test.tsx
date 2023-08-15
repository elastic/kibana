/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import { getSummaryRows } from '../../../common/components/event_details/get_alert_summary_rows';
import { usePrevalence } from './use_prevalence';
import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_context';

jest.mock('../../../common/components/event_details/get_alert_summary_rows');

const eventId = 'eventId';
const browserFields = null;
const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;
const scopeId = 'scopeId';

describe('usePrevalence', () => {
  let hookResult: RenderHookResult<unknown, ReactElement[]>;

  it('should return 1 row to render', () => {
    const mockSummaryRow = {
      title: 'test',
      description: {
        data: {
          field: 'field',
        },
        values: ['value'],
      },
    };
    (getSummaryRows as jest.Mock).mockReturnValue([mockSummaryRow]);

    hookResult = renderHook(() =>
      usePrevalence({ browserFields, dataFormattedForFieldBrowser, eventId, scopeId })
    );

    expect(hookResult.result.current.length).toEqual(1);
  });

  it('should return empty true', () => {
    (getSummaryRows as jest.Mock).mockReturnValue([]);

    hookResult = renderHook(() =>
      usePrevalence({ browserFields, dataFormattedForFieldBrowser, eventId, scopeId })
    );

    expect(hookResult.result.current.length).toEqual(0);
  });
});
