/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiHasDynamicActions,
  type HasDynamicActions,
} from '@kbn/embeddable-enhanced-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import {
  tracksOverlays,
  type PresentationContainer,
  type TracksOverlays,
} from '@kbn/presentation-containers';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasSupportedTriggers,
  apiIsOfType,
  getInheritedViewMode,
  type CanAccessViewMode,
  type EmbeddableApiContext,
  type HasUniqueId,
  type HasParentApi,
  type HasSupportedTriggers,
  type HasType,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React from 'react';
import { StartDependencies } from '../../../../plugin';
import { createDrilldownTemplatesFromSiblings, ensureNestedTriggers } from '../drilldown_shared';

export const OPEN_FLYOUT_ADD_DRILLDOWN = 'OPEN_FLYOUT_ADD_DRILLDOWN';

export interface OpenFlyoutAddDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export type FlyoutCreateDrilldownActionApi = CanAccessViewMode &
  HasDynamicActions &
  HasParentApi<HasType & Partial<PresentationContainer & TracksOverlays>> &
  HasSupportedTriggers &
  Partial<HasUniqueId>;

const isApiCompatible = (api: unknown | null): api is FlyoutCreateDrilldownActionApi =>
  apiHasDynamicActions(api) &&
  apiHasParentApi(api) &&
  apiCanAccessViewMode(api) &&
  apiHasSupportedTriggers(api);

export class FlyoutCreateDrilldownAction implements Action<EmbeddableApiContext> {
  public readonly type = OPEN_FLYOUT_ADD_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_ADD_DRILLDOWN;
  public order = 12;

  constructor(protected readonly params: OpenFlyoutAddDrilldownParams) {}

  public getDisplayName() {
    return i18n.translate('xpack.dashboard.FlyoutCreateDrilldownAction.displayName', {
      defaultMessage: 'Create drilldown',
    });
  }

  public getIconType() {
    return 'plusInCircle';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;
    if (
      getInheritedViewMode(embeddable) !== 'edit' ||
      !apiIsOfType(embeddable.parentApi, 'dashboard')
    )
      return false;

    const supportedTriggers = [CONTEXT_MENU_TRIGGER, ...embeddable.supportedTriggers()];

    /**
     * Check if there is an intersection between all registered drilldowns possible triggers that they could be attached to
     * and triggers that current embeddable supports
     */
    const allPossibleTriggers = this.params
      .start()
      .plugins.uiActionsEnhanced.getActionFactories()
      .map((factory) => (factory.isCompatibleLicense() ? factory.supportedTriggers() : []))
      .reduce((res, next) => res.concat(next), []);

    return ensureNestedTriggers(supportedTriggers).some((trigger) =>
      allPossibleTriggers.includes(trigger)
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const { core, plugins } = this.params.start();

    const templates = createDrilldownTemplatesFromSiblings(embeddable);
    const overlayTracker = tracksOverlays(embeddable.parentApi) ? embeddable.parentApi : undefined;
    const close = () => {
      if (overlayTracker) overlayTracker.clearOverlays();
      handle.close();
    };

    const triggers = [
      ...ensureNestedTriggers(embeddable.supportedTriggers()),
      CONTEXT_MENU_TRIGGER,
    ];

    const handle = core.overlays.openFlyout(
      toMountPoint(
        <plugins.uiActionsEnhanced.DrilldownManager
          closeAfterCreate
          initialRoute={'/new'}
          dynamicActionManager={embeddable.enhancements.dynamicActions}
          triggers={triggers}
          placeContext={{ embeddable }}
          templates={templates}
          onClose={close}
        />,
        { theme$: core.theme.theme$ }
      ),
      {
        ownFocus: true,
        'data-test-subj': 'createDrilldownFlyout',
        onClose: () => {
          close();
        },
      }
    );

    overlayTracker?.openOverlay(handle);
  }
}
