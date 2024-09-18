/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import {
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID,
} from './test_ids';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '@kbn/security-solution-common';

jest.mock('../../shared/hooks/use_fetch_related_alerts_by_session');
jest.mock('../hooks/use_paginated_alerts');

const entityId = 'entityId';
const scopeId = 'scopeId';
const eventId = 'eventId';

const TOGGLE_ICON = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID
);
const TITLE_ICON = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID
);
const TITLE_TEXT = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID
);

const renderRelatedAlertsBySession = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} eventId={eventId} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<RelatedAlertsBySession />', () => {
  it('should render component correctly', () => {
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: ['1', '2'],
      dataCount: 2,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      erro: false,
      data: [
        {
          _id: '1',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-01'],
            'kibana.alert.rule.name': ['Rule1'],
            'kibana.alert.reason': ['Reason1'],
            'kibana.alert.severity': ['Severity1'],
          },
        },
        {
          _id: '2',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-02'],
            'kibana.alert.rule.name': ['Rule2'],
            'kibana.alert.reason': ['Reason2'],
            'kibana.alert.severity': ['Severity2'],
          },
        },
      ],
    });

    const { getByTestId } = renderRelatedAlertsBySession();
    expect(getByTestId(TOGGLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toBeInTheDocument();
    expect(
      getByTestId(`${CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID}InvestigateInTimeline`)
    ).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = renderRelatedAlertsBySession();
    expect(container).toBeEmptyDOMElement();
  });

  it('should render no data message', () => {
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByText } = renderRelatedAlertsBySession();
    expect(getByText('No alerts related by session.')).toBeInTheDocument();
  });
});
