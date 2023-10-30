/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable import/no-extraneous-dependencies */

import '@testing-library/dom/node_modules/pretty-format';
import React from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n-react';
import { RenderOptions, render } from '@testing-library/react';
import { LensAppState } from '../state_management/types';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { makeLensStore } from '../mocks/store_mocks'; // TODO: remove this once we move it to utils

type LensStore = ReturnType<typeof makeLensStore>['store'];

export const renderWithReduxStore = (
  ui: JSX.Element,
  options?: RenderOptions,
  { preloadedState }: { preloadedState: Partial<LensAppState> } = { preloadedState: {} }
): ReturnType<typeof render> & { store: LensStore } => {
  const { store } = makeLensStore({ preloadedState });

  const Wrapper: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => (
    <Provider store={store}>
      <I18nProvider>{children}</I18nProvider>
    </Provider>
  );

  const rtlRender = render(ui, { wrapper: Wrapper, ...options });

  return {
    store,
    ...rtlRender,
  };
};
