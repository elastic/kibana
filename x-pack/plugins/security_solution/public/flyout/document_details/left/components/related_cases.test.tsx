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
  CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID,
} from './test_ids';
import { RelatedCases } from './related_cases';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';

jest.mock('../../shared/hooks/use_fetch_related_cases');
jest.mock('../../../../common/components/links', () => ({
  CaseDetailsLink: jest
    .fn()
    .mockImplementation(({ title }) => <>{`<CaseDetailsLink title="${title}" />`}</>),
}));

const eventId = 'eventId';

const TOGGLE_ICON = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID
);
const TITLE_ICON = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID
);
const TITLE_TEXT = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID
);

const renderRelatedCases = () =>
  render(
    <IntlProvider locale="en">
      <RelatedCases eventId={eventId} />
    </IntlProvider>
  );

describe('<RelatedCases />', () => {
  it('should render many related cases correctly', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          id: 'id',
          title: 'title',
          description: 'description',
          status: 'open',
        },
      ],
      dataCount: 1,
    });

    const { getByTestId } = renderRelatedCases();
    expect(getByTestId(TOGGLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toHaveTextContent('1 related case');
    expect(getByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = renderRelatedCases();
    expect(container).toBeEmptyDOMElement();
  });

  it('should render no data message', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });

    const { getByText } = renderRelatedCases();
    expect(getByText('No related cases.')).toBeInTheDocument();
  });
});
