/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AssetDocumentTab } from './asset_document';
import { FLYOUT_BODY_TEST_ID } from './test_ids';
import { RightPanelContext } from '../../../document_details/right/context';
import { mockContextValue } from '../../../document_details/right/mocks/mock_context';
import userEvent from '@testing-library/user-event';
import {
  JSON_TAB_CONTENT_TEST_ID,
  TABLE_TAB_CONTENT_TEST_ID,
} from '../../../document_details/right/tabs/test_ids';

describe('AssetDocumentTab', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentTab />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toBeInTheDocument();
  });

  it('should preselect the table tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentTab />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(TABLE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should select json tab when clicked', async () => {
    const { getByTestId, getByTitle } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentTab />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    await userEvent.click(getByTitle('JSON'));

    expect(getByTestId(JSON_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should select table tab when path tab is table', async () => {
    const { getByTestId, getByTitle } = render(
      <TestProviders>
        <RightPanelContext.Provider value={mockContextValue}>
          <AssetDocumentTab path={{ tab: 'table' }} />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    await userEvent.click(getByTitle('JSON')); // make sure Table isn't selected
    await userEvent.click(getByTitle('Table'));

    expect(getByTestId(TABLE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});
