/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { UiActionsActionDefinition as ActionDefinition } from '../../../../../src/plugins/ui_actions/public';
import { ViewMode } from '../../../../../src/plugins/embeddable/public';
import { EnhancedEmbeddableContext, EnhancedEmbeddable } from '../types';

export const txtOneDrilldown = i18n.translate(
  'xpack.embeddableEnhanced.actions.panelNotifications.oneDrilldown',
  {
    defaultMessage: 'Panel has 1 drilldown',
  }
);

export const txtManyDrilldowns = (count: number) =>
  i18n.translate('xpack.embeddableEnhanced.actions.panelNotifications.manyDrilldowns', {
    defaultMessage: 'Panel has {count} drilldowns',
    values: {
      count: String(count),
    },
  });

export const ACTION_PANEL_NOTIFICATIONS = 'ACTION_PANEL_NOTIFICATIONS';

/**
 * This action renders in "edit" mode number of events (dynamic action) a panel
 * has attached to it.
 */
export class PanelNotificationsAction implements ActionDefinition<EnhancedEmbeddableContext> {
  public readonly id = ACTION_PANEL_NOTIFICATIONS;

  private getEventCount(embeddable: EnhancedEmbeddable): number {
    return embeddable.enhancements.dynamicActions.state.get().events.length;
  }

  public readonly getDisplayName = ({ embeddable }: EnhancedEmbeddableContext) => {
    return String(this.getEventCount(embeddable));
  };

  public readonly getDisplayNameTooltip = ({ embeddable }: EnhancedEmbeddableContext) => {
    const count = this.getEventCount(embeddable);
    return !count ? '' : count === 1 ? txtOneDrilldown : txtManyDrilldowns(count);
  };

  public readonly isCompatible = async ({ embeddable }: EnhancedEmbeddableContext) => {
    if (embeddable.getInput().viewMode !== ViewMode.EDIT) return false;
    return this.getEventCount(embeddable) > 0;
  };

  public readonly execute = async () => {};
}
