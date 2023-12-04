/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvokeCreator } from 'xstate';
import { LogExplorerControllerContext, LogExplorerControllerEvent } from '../types';

export const createAndSetDataView =
  (): InvokeCreator<LogExplorerControllerContext, LogExplorerControllerEvent> =>
  async (context) => {
    if (!('discoverStateContainer' in context)) return;
    const { discoverStateContainer } = context;
    await discoverStateContainer.actions.createAndAppendAdHocDataView(
      context.datasetSelection.toDataviewSpec()
    );
  };
