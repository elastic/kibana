/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  SUMMARY_ROW_ICON_TEST_ID,
  SUMMARY_ROW_VALUE_TEST_ID,
  SUMMARY_ROW_LOADING_TEST_ID,
  INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID,
} from './test_ids';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';

jest.mock('../../shared/hooks/use_fetch_related_alerts_by_same_source_event');

const originalEventId = 'originalEventId';
const scopeId = 'scopeId';

const ICON_TEST_ID = SUMMARY_ROW_ICON_TEST_ID(
  INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID
);
const VALUE_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(
  INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID
);
const LOADING_TEST_ID = SUMMARY_ROW_LOADING_TEST_ID(
  INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID
);

describe('<RelatedAlertsBySameSourceEvent />', () => {
  it('should render many related alerts correctly', () => {
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 2,
    });

    const { getByTestId } = render(
      <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
    );
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('2 alerts related by source event');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
  });

  it('should render single related alerts correctly', () => {
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });

    const { getByTestId } = render(
      <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
    );
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('1 alert related by source event');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading skeleton', () => {
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = render(
      <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
    );
    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = render(
      <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
