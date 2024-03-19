/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  getViewModeSubject,
} from '@kbn/presentation-publishing';
import { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';

import { BehaviorSubject, merge } from 'rxjs';
import {
  apiHasDynamicActions,
  HasDynamicActions,
} from '../embeddables/interfaces/has_dynamic_actions';

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

export type PanelNotificationsActionApi = CanAccessViewMode & HasDynamicActions;

const isApiCompatible = (api: unknown | null): api is PanelNotificationsActionApi =>
  apiHasDynamicActions(api) && apiCanAccessViewMode(api);

/**
 * This action renders in "edit" mode number of events (dynamic action) a panel
 * has attached to it.
 */
export class PanelNotificationsAction implements ActionDefinition<EmbeddableApiContext> {
  public readonly id = ACTION_PANEL_NOTIFICATIONS;
  public type = ACTION_PANEL_NOTIFICATIONS;

  private getEventCount({ embeddable }: EmbeddableApiContext): number {
    return isApiCompatible(embeddable)
      ? (embeddable.dynamicActionsState$.getValue()?.dynamicActions.events ?? []).length
      : 0;
  }

  public getIconType = () => '';

  public readonly getDisplayName = ({ embeddable }: EmbeddableApiContext) => {
    return String(this.getEventCount({ embeddable }));
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public subscribeToCompatibilityChanges = (
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: PanelNotificationsAction) => void
  ) => {
    if (!isApiCompatible(embeddable)) return;

    return merge(
      getViewModeSubject(embeddable) ?? new BehaviorSubject(ViewMode.VIEW),
      embeddable.dynamicActionsState$
    ).subscribe(() => {
      onChange(
        getInheritedViewMode(embeddable) === ViewMode.EDIT &&
          this.getEventCount({ embeddable }) > 0,
        this
      );
    });
  };

  public readonly getDisplayNameTooltip = ({ embeddable }: EmbeddableApiContext) => {
    const count = this.getEventCount({ embeddable });
    return !count ? '' : count === 1 ? txtOneDrilldown : txtManyDrilldowns(count);
  };

  public readonly isCompatible = async ({ embeddable }: EmbeddableApiContext) => {
    return (
      isApiCompatible(embeddable) &&
      getInheritedViewMode(embeddable) === ViewMode.EDIT &&
      this.getEventCount({ embeddable }) > 0
    );
  };

  public readonly execute = async () => {};
}
