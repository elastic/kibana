/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddToBlockListContextMenu } from './add_to_block_list';
import { BlockListProvider } from '../../indicators/containers/block_list_provider';
import { SecuritySolutionContext } from '../../../containers/security_solution_context';
import { SecuritySolutionPluginContext } from '../../..';
import { getSecuritySolutionContextMock } from '../../../mocks/mock_security_context';
import { I18nProvider } from '@kbn/i18n-react';
const TEST_ID = 'test';

describe('<AddToBlockListContextMenu />', () => {
  it('should render an EuiContextMenuItem', () => {
    const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();

    const mockIndicatorFileHashValue: string = 'abc';
    const mockOnClick: () => void = () => window.alert('clicked!');

    const { getByTestId, getAllByText } = render(
      <I18nProvider>
        <SecuritySolutionContext.Provider value={mockSecurityContext}>
          <BlockListProvider>
            <AddToBlockListContextMenu
              data={mockIndicatorFileHashValue}
              onClick={mockOnClick}
              data-test-subj={TEST_ID}
            />
          </BlockListProvider>
        </SecuritySolutionContext.Provider>
      </I18nProvider>
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add blocklist entry')).toHaveLength(1);
  });

  it('should render a disabled EuiContextMenuItem if data is null', () => {
    const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();

    const mockIndicatorFileHashValue = null;
    const mockOnClick: () => void = () => window.alert('clicked!');

    const { getByTestId } = render(
      <I18nProvider>
        <SecuritySolutionContext.Provider value={mockSecurityContext}>
          <BlockListProvider>
            <AddToBlockListContextMenu
              data={mockIndicatorFileHashValue}
              onClick={mockOnClick}
              data-test-subj={TEST_ID}
            />
          </BlockListProvider>
        </SecuritySolutionContext.Provider>
      </I18nProvider>
    );

    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });

  it('should render a disabled EuiContextMenuItem if no write blocklist privilege', () => {
    const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();
    mockSecurityContext.blockList.canWriteBlocklist = false;

    const mockIndicatorFileHashValue: string = 'abc';
    const mockOnClick: () => void = () => window.alert('clicked!');

    const { getByTestId } = render(
      <I18nProvider>
        <SecuritySolutionContext.Provider value={mockSecurityContext}>
          <BlockListProvider>
            <AddToBlockListContextMenu
              data={mockIndicatorFileHashValue}
              onClick={mockOnClick}
              data-test-subj={TEST_ID}
            />
          </BlockListProvider>
        </SecuritySolutionContext.Provider>
      </I18nProvider>
    );

    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });
});
