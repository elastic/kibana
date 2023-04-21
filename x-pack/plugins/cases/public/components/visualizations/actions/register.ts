/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { CasesPluginStart } from '../../../types';
import { createAddToNewCaseLensAction } from './add_to_new_case';

export const registerUIActions = ({ uiActions }: CasesPluginStart) => {
  registerLensActions(uiActions);
};

const registerLensActions = (uiActions: UiActionsStart) => {
  const addToNewCaseAction = createAddToNewCaseLensAction({ order: 41 });
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, addToNewCaseAction);
};
