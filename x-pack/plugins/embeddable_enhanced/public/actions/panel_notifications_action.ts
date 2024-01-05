/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UiActionsActionDefinition as ActionDefinition, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { type HasDynamicActions, hasDynamicActions } from '@kbn/ui-actions-enhanced-plugin/public';
import { type EmbeddableApiContext, ViewMode, apiPublishesViewMode } from '@kbn/presentation-publishing';
import { EnhancedEmbeddable } from '../types';

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

export type PanelNotificationActionApi = PublishesViewMode & HasDynamicActions;

const isApiCompatible = (api: unknown | null): api is PanelNotificationActionApi =>
  Boolean(apiPublishesViewMode(api) && hasDynamicActions(api));

/**
 * This action renders in "edit" mode number of events (dynamic action) a panel
 * has attached to it.
 */
export class PanelNotificationsAction implements ActionDefinition<EmbeddableApiContext> {
  public readonly id = ACTION_PANEL_NOTIFICATIONS;
  public type = ACTION_PANEL_NOTIFICATIONS;

  private getEventCount(embeddable: PanelNotificationActionApi): number {
    return embeddable.enhancements.dynamicActions.state.get().events.length;
  }

  public getIconType = ({ embeddable }: EmbeddableApiContext) => '';

  public readonly getDisplayName = ({ embeddable }: EmbeddableApiContext) => {
    return String(this.getEventCount(embeddable));
  };

  /*
  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return true;
  }

  public subscribeToCompatibilityChanges = (
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: PanelNotificationsAction) => void
  ) => {
    // There is no notification for when a dynamic action is added or removed, so we subscribe to the embeddable root instead as a proxy.
    return embeddable
      .getRoot()
      .getInput$()
      .subscribe(() => {
        onChange(
          embeddable.getInput().viewMode === ViewMode.EDIT && this.getEventCount(embeddable) > 0,
          this
        );
      });
  };*/

  public readonly getDisplayNameTooltip = ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const count = this.getEventCount(embeddable);
    return !count ? '' : count === 1 ? txtOneDrilldown : txtManyDrilldowns(count);
  };

  public readonly isCompatible = async ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable)) return false;

    if (embeddable.viewMode.value !== 'edit') return false;

    return this.getEventCount(embeddable) > 0;
  };

  public readonly execute = async () => {};
}
