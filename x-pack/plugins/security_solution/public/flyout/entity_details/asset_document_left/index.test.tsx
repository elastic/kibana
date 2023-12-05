/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { AssetDocumentLeftPanel } from '.';
import { JSON_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
import { RightPanelContext } from '../../document_details/right/context';
import { mockContextValue } from '../../document_details/right/mocks/mock_context';

describe('<AssetDocumentLeftPanel />', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentLeftPanel />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(TABLE_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(JSON_TAB_TEST_ID)).toBeInTheDocument();
  });

  it('should preselect the table tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentLeftPanel />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutAssetTableTab')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('should select json tab when path tab is json', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentLeftPanel path={{ tab: 'json' }} />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutAssetJsonTab')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('should select table tab when path tab is table', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentLeftPanel path={{ tab: 'table' }} />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutAssetTableTab')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
