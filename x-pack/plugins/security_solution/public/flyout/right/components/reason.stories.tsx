/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { Reason } from './reason';
import { RightPanelContext } from '../context';

export default {
  component: Reason,
  title: 'Flyout/Reason',
};

// TODO to get this working, we need to spent some time getting all the foundation items for storybook
//  (ReduxStoreProvider, CellActionsProvider...) similarly to how it was done for the TestProvidersComponent
//  see ticket https://github.com/elastic/security-team/issues/6223
// export const Default: Story<void> = () => {
//   const panelContextValue = {
//     dataAsNestedObject: mockDataAsNestedObject,
//     dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
//   } as unknown as RightPanelContext;
//
//   return (
//     <RightPanelContext.Provider value={panelContextValue}>
//       <Reason />
//     </RightPanelContext.Provider>
//   );
// };

export const Empty: Story<void> = () => {
  const panelContextValue = {
    dataFormattedForFieldBrowser: {},
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={panelContextValue}>
      <Reason />
    </RightPanelContext.Provider>
  );
};
