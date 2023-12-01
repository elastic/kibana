/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { RightPanelContext } from '../context';
import {
  RISK_SCORE_VALUE_TEST_ID,
  SEVERITY_VALUE_TEST_ID,
  FLYOUT_HEADER_TITLE_TEST_ID,
  STATUS_BUTTON_TEST_ID,
} from './test_ids';
import { HeaderTitle } from './header_title';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../../../common/lib/kibana';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProvidersComponent } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
const flyoutContextValue = {} as unknown as ExpandableFlyoutContextValue;
const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
} as unknown as RightPanelContext;

const renderHeader = (contextValue: RightPanelContext) =>
  render(
    <TestProvidersComponent>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={contextValue}>
          <HeaderTitle />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </TestProvidersComponent>
  );

describe('<HeaderTitle />', () => {
  beforeEach(() => {
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
  });

  it('should render component', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SEVERITY_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(STATUS_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render rule name in the title if document is an alert', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('rule-name');
  });

  it('should render default document detail title if document is not an alert', () => {
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.name',
          values: [],
          originalValue: [],
          isObjectArray: false,
        },
      ],
    } as unknown as RightPanelContext;

    const { getByTestId } = renderHeader(contextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('Event details');
  });

  it('should not render document status if document is not an alert', () => {
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.name',
          values: [],
          originalValue: [],
          isObjectArray: false,
        },
      ],
    } as unknown as RightPanelContext;

    const { queryByTestId } = renderHeader(contextValue);
    expect(queryByTestId(STATUS_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render document status if flyout is open in preview', () => {
    const contextValue = {
      ...mockContextValue,
      isPreview: true,
    } as unknown as RightPanelContext;

    const { queryByTestId } = renderHeader(contextValue);
    expect(queryByTestId(STATUS_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
