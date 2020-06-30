/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import {
  createEditSwimlanePanelAction,
  EDIT_SWIMLANE_PANEL_ACTION,
  EditSwimlanePanelContext,
} from './edit_swimlane_panel_action';
import { UiActionsSetup } from '../../../../../src/plugins/ui_actions/public';
import { MlPluginStart, MlStartDependencies } from '../plugin';
import { CONTEXT_MENU_TRIGGER } from '../../../../../src/plugins/embeddable/public';

export function registerMlUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<MlStartDependencies, MlPluginStart>
) {
  const editSwimlanePanelAction = createEditSwimlanePanelAction(core.getStartServices);
  uiActions.registerAction(editSwimlanePanelAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, editSwimlanePanelAction.id);
}

declare module '../../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [EDIT_SWIMLANE_PANEL_ACTION]: EditSwimlanePanelContext;
  }
}
