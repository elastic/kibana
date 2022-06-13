/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { distinctUntilChanged, filter, map, skip, take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Action } from '@kbn/ui-actions-plugin/public';
import { reactToUiComponent, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { EmbeddableContext, ViewMode, CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  isEnhancedEmbeddable,
  embeddableEnhancedDrilldownGrouping,
} from '@kbn/embeddable-enhanced-plugin/public';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { txtDisplayName } from './i18n';
import { MenuItem } from './menu_item';
import { StartDependencies } from '../../../../plugin';
import { createDrilldownTemplatesFromSiblings, ensureNestedTriggers } from '../drilldown_shared';

export const OPEN_FLYOUT_EDIT_DRILLDOWN = 'OPEN_FLYOUT_EDIT_DRILLDOWN';

export interface FlyoutEditDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export class FlyoutEditDrilldownAction implements Action<EmbeddableContext> {
  public readonly type = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public order = 10;
  public grouping = embeddableEnhancedDrilldownGrouping;

  constructor(protected readonly params: FlyoutEditDrilldownParams) {}

  public getDisplayName() {
    return txtDisplayName;
  }

  public getIconType() {
    return 'list';
  }

  MenuItem = reactToUiComponent(MenuItem);

  public async isCompatible({ embeddable }: EmbeddableContext) {
    if (embeddable.getInput().viewMode !== ViewMode.EDIT) return false;
    if (!isEnhancedEmbeddable(embeddable)) return false;
    return embeddable.enhancements.dynamicActions.state.get().events.length > 0;
  }

  public async execute(context: EmbeddableContext) {
    const { core, plugins } = this.params.start();
    const { embeddable } = context;

    if (!isEnhancedEmbeddable(embeddable)) {
      throw new Error(
        'Need embeddable to be EnhancedEmbeddable to execute FlyoutEditDrilldownAction.'
      );
    }

    const templates = createDrilldownTemplatesFromSiblings(embeddable);
    const closed$ = new Subject<true>();
    const close = () => {
      closed$.next(true);
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
        />
      ),
      {
        ownFocus: true,
        'data-test-subj': 'editDrilldownFlyout',
      }
    );

    // Close flyout on application change.
    core.application.currentAppId$.pipe(takeUntil(closed$), skip(1), take(1)).subscribe(() => {
      close();
    });

    // Close flyout on dashboard switch to "view" mode.
    embeddable
      .getInput$()
      .pipe(
        takeUntil(closed$),
        map((input) => input.viewMode),
        distinctUntilChanged(),
        filter((mode) => mode !== ViewMode.EDIT),
        take(1)
      )
      .subscribe(() => {
        close();
      });
  }
}
