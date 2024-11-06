/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import {
  RISK_SCORE_VALUE_TEST_ID,
  SEVERITY_VALUE_TEST_ID,
  FLYOUT_ALERT_HEADER_TITLE_TEST_ID,
  STATUS_BUTTON_TEST_ID,
  ALERT_SUMMARY_PANEL_TEST_ID,
  ASSIGNEES_TEST_ID,
  ASSIGNEES_EMPTY_TEST_ID,
  NOTES_TITLE_TEST_ID,
} from './test_ids';
import { AlertHeaderTitle } from './alert_header_title';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../../../common/lib/kibana';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProvidersComponent } from '../../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_experimental_features');

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
} as unknown as DocumentDetailsContext;
const HEADER_TEXT_TEST_ID = `${FLYOUT_ALERT_HEADER_TITLE_TEST_ID}Text`;

const renderHeader = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProvidersComponent>
      <DocumentDetailsContext.Provider value={contextValue}>
        <AlertHeaderTitle />
      </DocumentDetailsContext.Provider>
    </TestProvidersComponent>
  );

describe('<AlertHeaderTitle />', () => {
  beforeEach(() => {
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
  });

  it('should render component', () => {
    const { getByTestId, queryByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(HEADER_TEXT_TEST_ID)).toHaveTextContent('rule-name');
    expect(getByTestId(SEVERITY_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ALERT_SUMMARY_PANEL_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(STATUS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_EMPTY_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render title correctly if flyout is in preview', () => {
    const { queryByTestId, getByTestId } = renderHeader({ ...mockContextValue, isPreview: true });
    expect(getByTestId(HEADER_TEXT_TEST_ID)).toHaveTextContent('rule-name');

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(STATUS_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_EMPTY_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render notes section if experimental flag is enabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderHeader(mockContextValue);
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render fall back values if document is not alert', () => {
    const { getByTestId } = renderHeader({ ...mockContextValue, dataFormattedForFieldBrowser: [] });
    expect(getByTestId(HEADER_TEXT_TEST_ID)).toHaveTextContent('Document details');
  });
});
