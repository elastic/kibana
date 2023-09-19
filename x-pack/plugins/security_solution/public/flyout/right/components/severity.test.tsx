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
  FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID,
  FLYOUT_HEADER_SEVERITY_VALUE_TEST_ID,
} from './test_ids';
import { DocumentSeverity } from './severity';
import { mockGetFieldsData } from '../mocks/mock_context';
import { TestProviders } from '../../../common/mock';

describe('<DocumentSeverity />', () => {
  it('should render severity information', () => {
    const contextValue = {
      getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <DocumentSeverity />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID)).toBeInTheDocument();
    const severity = getByTestId(FLYOUT_HEADER_SEVERITY_VALUE_TEST_ID);
    expect(severity).toBeInTheDocument();
    expect(severity).toHaveTextContent('Low');
  });

  it('should render empty component if missing getFieldsData value', () => {
    const contextValue = {
      getFieldsData: jest.fn(),
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={contextValue}>
        <DocumentSeverity />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if getFieldsData is invalid array', () => {
    const contextValue = {
      getFieldsData: jest.fn().mockImplementation(() => ['abc']),
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={contextValue}>
        <DocumentSeverity />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if getFieldsData is invalid string', () => {
    const contextValue = {
      getFieldsData: jest.fn().mockImplementation(() => 'abc'),
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={contextValue}>
        <DocumentSeverity />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
