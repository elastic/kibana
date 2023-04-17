/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { sourcererReducer } from '../../../common/store/sourcerer';
import { inputsReducer } from '../../../common/store/inputs';
import type { LeftPanelContext } from '../context';
import { LeftFlyoutContext } from '../context';
import { AnalyzeGraph } from './analyze_graph';

export default {
  component: AnalyzeGraph,
  title: 'Flyout/AnalyzeGraph',
};

// TODO to get this working, we need to spent some time getting all the foundation items for storybook
//  (ReduxStoreProvider, CellActionsProvider...) similarly to how it was done for the TestProvidersComponent
//  see ticket https://github.com/elastic/security-team/issues/6223
// export const Default: Story<void> = () => {
//   const contextValue = {
//     eventId: 'some_id',
//   } as unknown as LeftPanelContext;
//
//   return (
//     <LeftFlyoutContext.Provider value={contextValue}>
//       <AnalyzeGraph />
//     </LeftFlyoutContext.Provider>
//   );
// };

export const Error: Story<void> = () => {
  const store = configureStore({
    reducer: {
      inputs: inputsReducer,
      sourcerer: sourcererReducer,
    },
  });
  const services = {
    data: {},
    notifications: {
      toasts: {
        addError: () => {},
        addSuccess: () => {},
        addWarning: () => {},
        remove: () => {},
      },
    },
  } as unknown as CoreStart;
  const KibanaReactContext = createKibanaReactContext({ ...services });

  const contextValue = {
    eventId: null,
  } as unknown as LeftPanelContext;

  return (
    <MemoryRouter>
      <ReduxStoreProvider store={store}>
        <KibanaReactContext.Provider>
          <LeftFlyoutContext.Provider value={contextValue}>
            <AnalyzeGraph />
          </LeftFlyoutContext.Provider>
        </KibanaReactContext.Provider>
      </ReduxStoreProvider>
    </MemoryRouter>
  );
};
