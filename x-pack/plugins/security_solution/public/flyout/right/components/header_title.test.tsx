/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import {
  FLYOUT_HEADER_CHAT_BUTTON_TEST_ID,
  FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID,
  FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID,
  FLYOUT_HEADER_SHARE_BUTTON_TEST_ID,
  FLYOUT_HEADER_TITLE_TEST_ID,
} from './test_ids';
import { HeaderTitle } from './header_title';
import { DOCUMENT_DETAILS } from './translations';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../../common/lib/kibana';
import { mockDataFormattedForFieldBrowser, mockGetFieldsData } from '../mocks/mock_context';
import { useAssistant } from '../hooks/use_assistant';
import { MockAssistantProvider } from '../../../common/mock/mock_assistant_provider';

jest.mock('../../../common/lib/kibana');
jest.mock('../hooks/use_assistant');

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

const renderHeader = (contextValue: RightPanelContext) =>
  render(
    <MockAssistantProvider>
      <RightPanelContext.Provider value={contextValue}>
        <HeaderTitle />
      </RightPanelContext.Provider>
    </MockAssistantProvider>
  );

describe('<HeaderTitle />', () => {
  beforeEach(() => {
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
    jest.mocked(useAssistant).mockReturnValue({ showAssistant: true, promptContextId: '' });
  });

  it('should render mitre attack information', () => {
    const contextValue = {
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
    } as unknown as RightPanelContext;

    const { getByTestId } = renderHeader(contextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render rule name in the title if document is an alert', () => {
    const contextValue = {
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.uuid',
          values: ['123'],
          originalValue: ['123'],
          isObjectArray: false,
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.name',
          values: ['test'],
          originalValue: ['test'],
          isObjectArray: false,
        },
      ],
      getFieldsData: () => [],
    } as unknown as RightPanelContext;

    const { getByTestId } = renderHeader(contextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('test');
  });

  it('should render share button in the title if document is an alert with url info', () => {
    const contextValue = {
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.uuid',
          values: ['123'],
          originalValue: ['123'],
          isObjectArray: false,
        },
        {
          category: 'kibana',
          field: 'kibana.alert.url',
          values: ['http://kibana.url/alert/id'],
          originalValue: ['http://kibana.url/alert/id'],
          isObjectArray: false,
        },
      ],
      getFieldsData: () => [],
    } as unknown as RightPanelContext;

    const { getByTestId } = renderHeader(contextValue);

    expect(getByTestId(FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render share button in the title if alert is missing url info', () => {
    const contextValue = {
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.uuid',
          values: ['123'],
          originalValue: ['123'],
          isObjectArray: false,
        },
      ],
      getFieldsData: () => [],
    } as unknown as RightPanelContext;

    const { queryByTestId } = renderHeader(contextValue);

    expect(queryByTestId(FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render chat button in the title', () => {
    const contextValue = {
      dataFormattedForFieldBrowser: [],
      getFieldsData: () => [],
    } as unknown as RightPanelContext;

    const { getByTestId } = renderHeader(contextValue);

    expect(getByTestId(FLYOUT_HEADER_CHAT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render chat button in the title if should not be shown', () => {
    jest.mocked(useAssistant).mockReturnValue({ showAssistant: false, promptContextId: '' });
    const contextValue = {
      dataFormattedForFieldBrowser: [],
      getFieldsData: () => [],
    } as unknown as RightPanelContext;

    const { queryByTestId } = renderHeader(contextValue);

    expect(queryByTestId(FLYOUT_HEADER_CHAT_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render default document detail title if document is not an alert', () => {
    const contextValue = {
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.name',
          values: [],
          originalValue: [],
          isObjectArray: false,
        },
      ],
      getFieldsData: () => [],
    } as unknown as RightPanelContext;

    const { getByTestId } = renderHeader(contextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent(DOCUMENT_DETAILS);
  });
});
