/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddToBlockListContextMenu } from '.';
import { BlockListProvider } from '../../../indicators/containers/block_list_provider';
import { SecuritySolutionContext } from '../../../../containers/security_solution_context';
import { SecuritySolutionPluginContext } from '../../../..';
import { getSecuritySolutionContextMock } from '../../../../common/mocks/mock_security_context';

describe('<AddToBlockListContextMenu />', () => {
  it('should render an EuiContextMenuItem', () => {
    const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();

    const mockIndicatorFileHashValue: string = 'abc';
    const mockOnClick: () => void = () => window.alert('clicked!');

    const component = render(
      <SecuritySolutionContext.Provider value={mockSecurityContext}>
        <BlockListProvider>
          <AddToBlockListContextMenu data={mockIndicatorFileHashValue} onClick={mockOnClick} />
        </BlockListProvider>
      </SecuritySolutionContext.Provider>
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a disabled EuiContextMenuItem', () => {
    const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();

    const mockIndicatorFileHashValue = null;
    const mockOnClick: () => void = () => window.alert('clicked!');

    const component = render(
      <SecuritySolutionContext.Provider value={mockSecurityContext}>
        <BlockListProvider>
          <AddToBlockListContextMenu data={mockIndicatorFileHashValue} onClick={mockOnClick} />
        </BlockListProvider>
      </SecuritySolutionContext.Provider>
    );

    expect(component).toMatchSnapshot();
  });
});
