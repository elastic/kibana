/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import {
  SUMMARY_ROW_ICON_TEST_ID,
  SUMMARY_ROW_VALUE_TEST_ID,
  SUMMARY_ROW_LOADING_TEST_ID,
  CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID,
} from './test_ids';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';

jest.mock('../../shared/hooks/use_fetch_related_alerts_by_session');

const entityId = 'entityId';
const scopeId = 'scopeId';

const ICON_TEST_ID = SUMMARY_ROW_ICON_TEST_ID(CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID);
const VALUE_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID);
const LOADING_TEST_ID = SUMMARY_ROW_LOADING_TEST_ID(CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID);

const renderRelatedAlertsBySession = () =>
  render(
    <IntlProvider locale="en">
      <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} />
    </IntlProvider>
  );

describe('<RelatedAlertsBySession />', () => {
  it('should render many related alerts correctly', () => {
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 2,
    });

    const { getByTestId } = renderRelatedAlertsBySession();
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('2 alerts related by session');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
  });

  it('should render single related alerts correctly', () => {
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });

    const { getByTestId } = renderRelatedAlertsBySession();
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('1 alert related by session');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading skeleton', () => {
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = renderRelatedAlertsBySession();
    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = renderRelatedAlertsBySession();
    expect(container).toBeEmptyDOMElement();
  });
});
