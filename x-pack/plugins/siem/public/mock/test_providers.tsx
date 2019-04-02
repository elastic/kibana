/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import * as React from 'react';
import { DragDropContext, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { pure } from 'recompose';
import { Store } from 'redux';
import { ThemeProvider } from 'styled-components';

import { KibanaConfigContext } from '../components/formatted_date';
import { AppTestingFrameworkAdapter } from '../lib/adapters/framework/testing_framework_adapter';
import { createStore, State } from '../store';

import { mockFrameworks, mockGlobalState } from '.';

const state: State = mockGlobalState;

interface Props {
  children: React.ReactNode;
  mockFramework?: Partial<AppTestingFrameworkAdapter>;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
}

/** A utility for wrapping children in the providers required to run most tests */
export const TestProviders = pure<Props>(
  ({
    children,
    store = createStore(state),
    mockFramework = mockFrameworks.default_UTC,
    onDragEnd = jest.fn(),
  }) => (
    <ReduxStoreProvider store={store}>
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    </ReduxStoreProvider>
  )
);
