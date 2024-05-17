/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanel } from '@elastic/eui';
import { Story } from '@storybook/react';
import React from 'react';
import { SecuritySolutionPluginContext } from '../../..';
import { SecuritySolutionContext } from '../../../containers/security_solution_context';
import { getSecuritySolutionContextMock } from '../../../mocks/mock_security_context';
import { BlockListProvider } from '../../indicators/containers/block_list_provider';
import { AddToBlockListContextMenu } from './add_to_block_list';

export default {
  title: 'AddToBlocklist',
};

export const ContextMenu: Story<void> = () => {
  const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();

  const mockIndicatorFileHashValue: string = 'abc';
  const mockOnClick: () => void = () => window.alert('clicked!');
  const items = [
    <AddToBlockListContextMenu data={mockIndicatorFileHashValue} onClick={mockOnClick} />,
  ];

  return (
    <SecuritySolutionContext.Provider value={mockSecurityContext}>
      <BlockListProvider>
        <EuiContextMenuPanel items={items} />
      </BlockListProvider>
    </SecuritySolutionContext.Provider>
  );
};

export const Disabled: Story<void> = () => {
  const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();
  mockSecurityContext.blockList.canWriteBlocklist = false;

  const mockIndicatorFileHashValue: string = 'abc';
  const mockOnClick: () => void = () => window.alert('clicked!');
  const items = [
    <AddToBlockListContextMenu data={mockIndicatorFileHashValue} onClick={mockOnClick} />,
  ];

  return (
    <SecuritySolutionContext.Provider value={mockSecurityContext}>
      <BlockListProvider>
        <EuiContextMenuPanel items={items} />
      </BlockListProvider>
    </SecuritySolutionContext.Provider>
  );
};
