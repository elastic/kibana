/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUseContext } from '../../lib/create_use_context';

import { addPanel, initialState, reducer, PanelController } from './store';

const { Provider, useRead, useActions } = createUseContext(reducer, initialState, 'UI');

export const UIProvider = Provider;
export const useUI = useRead;
export const useUIActions = () => {
  const dispatch = useActions();

  return {
    addPanel: (panel: PanelController) => dispatch(addPanel(panel)),
  };
};
