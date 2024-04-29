/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';

import { createAddToExistingCaseLensAction } from './add_to_existing_case';
import type { CasesUIActionProps } from './types';

export const registerUIActions = ({
  core,
  plugins,
  caseContextProps,
  history,
  storage,
}: CasesUIActionProps) => {
  registerLensActions({ core, plugins, caseContextProps, history, storage });
};

const registerLensActions = ({
  core,
  plugins,
  caseContextProps,
  history,
  storage,
}: CasesUIActionProps) => {
  const addToExistingCaseAction = createAddToExistingCaseLensAction({
    core,
    plugins,
    caseContextProps,
    history,
    storage,
  });
  plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, addToExistingCaseAction);
};
