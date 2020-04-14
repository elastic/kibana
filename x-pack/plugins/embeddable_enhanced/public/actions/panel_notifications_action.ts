/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionsActionDefinition as ActionDefinition } from '../../../../../src/plugins/ui_actions/public';
import { ViewMode } from '../../../../../src/plugins/embeddable/public';
import { EnhancedEmbeddableContext } from '../types';

export const ACTION_PANEL_NOTIFICATIONS = 'ACTION_PANEL_NOTIFICATIONS';

/**
 * This action renders in "edit" mode number of events (dynamic action) a panel
 * has attached to it.
 */
export class PanelNotificationsAction implements ActionDefinition<EnhancedEmbeddableContext> {
  public readonly id = ACTION_PANEL_NOTIFICATIONS;

  public readonly getDisplayName = (context: EnhancedEmbeddableContext) => {
    return String(context.embeddable.enhancements.dynamicActions.state.get().events.length);
  };

  public readonly isCompatible = async ({ embeddable }: EnhancedEmbeddableContext) => {
    if (embeddable.getInput().viewMode !== ViewMode.EDIT) return false;
    return embeddable.enhancements.dynamicActions.state.get().events.length > 0;
  };

  public readonly execute = async () => {};
}
