/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID,
} from './test_ids';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_context';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../shared/components/test_ids';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';

jest.mock('../../shared/hooks/use_fetch_related_alerts_by_same_source_event');
jest.mock('../hooks/use_paginated_alerts');

const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;
const scopeId = 'scopeId';

const TOGGLE_ICON = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID
);
const TITLE_ICON = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID
);
const TITLE_TEXT = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID
);

describe('<RelatedAlertsBySameSourceEvent />', () => {
  it('should render component correctly', () => {
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
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

    const { getByTestId } = render(
      <RelatedAlertsBySameSourceEvent
        dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
        scopeId={scopeId}
      />
    );
    expect(getByTestId(TOGGLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = render(
      <RelatedAlertsBySameSourceEvent
        dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
        scopeId={scopeId}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
