/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type * as H from 'history';

import type { CasesPluginStart } from '../../../types';
import { createAddToNewCaseLensAction } from './add_to_new_case';
import { createAddToExistingCaseLensAction } from './add_to_existing_case';
import type { UIActionProps } from './types';

export const registerUIActions = (
  coreStart: CoreStart,
  plugins: CasesPluginStart,
  caseContextProps: UIActionProps,
  history: H.History
) => {
  registerLensActions(coreStart, plugins, caseContextProps, history);
};

const registerLensActions = (
  coreStart: CoreStart,
  plugins: CasesPluginStart,
  caseContextProps: UIActionProps,
  history: H.History
) => {
  const addToNewCaseAction = createAddToNewCaseLensAction({
    // order: 42,
    coreStart,
    plugins,
    caseContextProps,
  });
  plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, addToNewCaseAction);

  const addToExistingCaseAction = createAddToExistingCaseLensAction({
    // order: 41,
    coreStart,
    plugins,
    caseContextProps,
    history,
  });
  plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, addToExistingCaseAction);
};
