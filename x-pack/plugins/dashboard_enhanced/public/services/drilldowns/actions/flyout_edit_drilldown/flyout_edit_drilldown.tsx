/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  tracksOverlays,
  type PresentationContainer,
  type TracksOverlays,
} from '@kbn/presentation-containers';
import {
  apiCanAccessViewMode,
  apiHasSupportedTriggers,
  getInheritedViewMode,
  type CanAccessViewMode,
  type EmbeddableApiContext,
  type HasUniqueId,
  type HasParentApi,
  type HasSupportedTriggers,
} from '@kbn/presentation-publishing';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  apiHasDynamicActions,
  type HasDynamicActions,
} from '@kbn/embeddable-enhanced-plugin/public';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { txtDisplayName } from './i18n';
import { MenuItem } from './menu_item';
import { StartDependencies } from '../../../../plugin';
import {
  createDrilldownTemplatesFromSiblings,
  DRILLDOWN_MAX_WIDTH,
  ensureNestedTriggers,
} from '../drilldown_shared';

export const OPEN_FLYOUT_EDIT_DRILLDOWN = 'OPEN_FLYOUT_EDIT_DRILLDOWN';

export interface FlyoutEditDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export type FlyoutEditDrilldownActionApi = CanAccessViewMode &
  Required<HasDynamicActions> &
  HasParentApi<Partial<PresentationContainer & TracksOverlays>> &
  HasSupportedTriggers &
  Partial<HasUniqueId>;

const isApiCompatible = (api: unknown | null): api is FlyoutEditDrilldownActionApi =>
  apiHasDynamicActions(api) && apiCanAccessViewMode(api) && apiHasSupportedTriggers(api);

export class FlyoutEditDrilldownAction implements Action<EmbeddableApiContext> {
  public readonly type = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public order = 10;

  constructor(protected readonly params: FlyoutEditDrilldownParams) {}

  public getDisplayName() {
    return txtDisplayName;
  }

  public getIconType() {
    return 'list';
  }

  public readonly MenuItem = MenuItem as any;

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable) || getInheritedViewMode(embeddable) !== 'edit') return false;
    return (embeddable.dynamicActionsState$.getValue()?.dynamicActions.events ?? []).length > 0;
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

    const handle = core.overlays.openFlyout(
      toMountPoint(
        <plugins.uiActionsEnhanced.DrilldownManager
          initialRoute={'/manage'}
          dynamicActionManager={embeddable.enhancements.dynamicActions}
          triggers={[...ensureNestedTriggers(embeddable.supportedTriggers()), CONTEXT_MENU_TRIGGER]}
          placeContext={{ embeddable }}
          templates={templates}
          onClose={close}
        />,
        core
      ),
      {
        maxWidth: DRILLDOWN_MAX_WIDTH,
        ownFocus: true,
        'data-test-subj': 'editDrilldownFlyout',
        onClose: () => {
          close();
        },
      }
    );

    overlayTracker?.openOverlay(handle);
  }
}
