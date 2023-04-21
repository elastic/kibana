/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { CasesPluginStart } from '../../../types';
import type { CasesContextProps } from '../../cases_context';
import { createAddToNewCaseLensAction } from './add_to_new_case';

export const registerUIActions = (
  { uiSettings }: CoreStart,
  { uiActions }: CasesPluginStart,
  getCreateCaseFlyoutProps: CasesContextProps
) => {
  registerLensActions(uiActions, getCreateCaseFlyoutProps, uiSettings);
};

const registerLensActions = (
  uiActions: UiActionsStart,
  getCreateCaseFlyoutProps: CasesContextProps,
  uiSettings: IUiSettingsClient
) => {
  const addToNewCaseAction = createAddToNewCaseLensAction({
    order: 41,
    getCreateCaseFlyoutProps,
    uiSettings,
  });
  uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, addToNewCaseAction);
};
