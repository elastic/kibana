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
  RESPONSE_BUTTON_TEST_ID,
  RESPONSE_SECTION_CONTENT_TEST_ID,
  RESPONSE_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { ResponseSection } from './response_section';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { useExpandSection } from '../hooks/use_expand_section';

jest.mock('../hooks/use_expand_section');

const PREVIEW_MESSAGE = 'Response is not available in alert preview.';
const OPEN_FLYOUT_MESSAGE = 'Open alert details to access response actions.';

const renderResponseSection = () =>
  render(
    <IntlProvider locale="en">
      <TestProvider>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <ResponseSection />
        </DocumentDetailsContext.Provider>
      </TestProvider>
    </IntlProvider>
  );

describe('<ResponseSection />', () => {
  it('should render response component', () => {
    const { getByTestId } = renderResponseSection();

    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toHaveTextContent('Response');
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component collapsed if value is false in local storage', () => {
    (useExpandSection as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderResponseSection();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderResponseSection();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeVisible();
  });

  it('should render response button for event kind signal', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);

    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'signal';
      }
    };

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <TestProvider>
          <DocumentDetailsContext.Provider
            value={{
              ...mockContextValue,
              getFieldsData: mockGetFieldsData,
            }}
          >
            <ResponseSection />
          </DocumentDetailsContext.Provider>
        </TestProvider>
      </IntlProvider>
    );
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render preview message if flyout is in preview', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <TestProvider>
          <DocumentDetailsContext.Provider value={{ ...mockContextValue, isPreview: true }}>
            <ResponseSection />
          </DocumentDetailsContext.Provider>
        </TestProvider>
      </IntlProvider>
    );
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toHaveTextContent(PREVIEW_MESSAGE);
  });

  it('should render open details flyout message if flyout is in preview', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <TestProvider>
          <DocumentDetailsContext.Provider value={{ ...mockContextValue, isPreviewMode: true }}>
            <ResponseSection />
          </DocumentDetailsContext.Provider>
        </TestProvider>
      </IntlProvider>
    );
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toHaveTextContent(OPEN_FLYOUT_MESSAGE);
  });

  it('should render empty component if document is not signal', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);

    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
      }
    };
    const { container } = render(
      <IntlProvider locale="en">
        <TestProvider>
          <DocumentDetailsContext.Provider
            value={{
              ...mockContextValue,
              getFieldsData: mockGetFieldsData,
            }}
          >
            <ResponseSection />
          </DocumentDetailsContext.Provider>
        </TestProvider>
      </IntlProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
