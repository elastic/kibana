/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { getSummaryRows } from '../../../common/components/event_details/get_alert_summary_rows';
import { LeftPanelContext } from '../context';
import { PrevalenceDetails } from './prevalence_details';
import {
  PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TEST_ID,
} from './test_ids';
import { useFetchFieldValuePairByEventType } from '../../shared/hooks/use_fetch_field_value_pair_by_event_type';
import { useFetchFieldValuePairWithAggregation } from '../../shared/hooks/use_fetch_field_value_pair_with_aggregation';
import { useFetchUniqueByField } from '../../shared/hooks/use_fetch_unique_by_field';

jest.mock('../../../common/components/event_details/get_alert_summary_rows');
jest.mock('../../shared/hooks/use_fetch_field_value_pair_by_event_type');
jest.mock('../../shared/hooks/use_fetch_field_value_pair_with_aggregation');
jest.mock('../../shared/hooks/use_fetch_unique_by_field');

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
} as unknown as LeftPanelContext;

describe('PrevalenceDetails', () => {
  jest.mocked(useFetchFieldValuePairByEventType).mockReturnValue({
    loading: false,
    error: false,
    count: 1,
  });
  jest.mocked(useFetchFieldValuePairWithAggregation).mockReturnValue({
    loading: false,
    error: false,
    count: 1,
  });
  jest.mocked(useFetchUniqueByField).mockReturnValue({
    loading: false,
    error: false,
    count: 1,
  });

  it('should render the table', () => {
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

    const { getByTestId } = render(
      <LeftPanelContext.Provider value={panelContextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render the error message if no highlighted fields', () => {
    jest.mocked(getSummaryRows).mockReturnValue([]);

    const { getByTestId } = render(
      <LeftPanelContext.Provider value={panelContextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID)).toBeInTheDocument();
  });
});
