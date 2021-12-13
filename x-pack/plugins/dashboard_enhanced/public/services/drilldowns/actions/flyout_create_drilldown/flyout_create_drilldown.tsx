/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { distinctUntilChanged, filter, map, skip, take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Action } from '../../../../../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableContext,
  ViewMode,
} from '../../../../../../../../src/plugins/embeddable/public';
import {
  isEnhancedEmbeddable,
  embeddableEnhancedDrilldownGrouping,
} from '../../../../../../embeddable_enhanced/public';
import { StartDependencies } from '../../../../plugin';
import { StartServicesGetter } from '../../../../../../../../src/plugins/kibana_utils/public';
import { ensureNestedTriggers, createDrilldownTemplatesFromSiblings } from '../drilldown_shared';

export const OPEN_FLYOUT_ADD_DRILLDOWN = 'OPEN_FLYOUT_ADD_DRILLDOWN';

export interface OpenFlyoutAddDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export class FlyoutCreateDrilldownAction implements Action<EmbeddableContext> {
  public readonly type = OPEN_FLYOUT_ADD_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_ADD_DRILLDOWN;
  public order = 12;
  public grouping = embeddableEnhancedDrilldownGrouping;

  constructor(protected readonly params: OpenFlyoutAddDrilldownParams) {}

  public getDisplayName() {
    return i18n.translate('xpack.dashboard.FlyoutCreateDrilldownAction.displayName', {
      defaultMessage: 'Create drilldown',
    });
  }

  public getIconType() {
    return 'plusInCircle';
  }

  private isEmbeddableCompatible(context: EmbeddableContext): boolean {
    if (!isEnhancedEmbeddable(context.embeddable)) return false;
    if (context.embeddable.getRoot().type !== 'dashboard') return false;
    const supportedTriggers = [
      CONTEXT_MENU_TRIGGER,
      ...(context.embeddable.supportedTriggers() || []),
    ];

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

  public async isCompatible(context: EmbeddableContext) {
    const isEditMode = context.embeddable.getInput().viewMode === 'edit';
    return isEditMode && this.isEmbeddableCompatible(context);
  }

  public async execute(context: EmbeddableContext) {
    const { core, plugins } = this.params.start();
    const { embeddable } = context;

    if (!isEnhancedEmbeddable(embeddable)) {
      throw new Error(
        'Need embeddable to be EnhancedEmbeddable to execute FlyoutCreateDrilldownAction.'
      );
    }

    const templates = createDrilldownTemplatesFromSiblings(embeddable);
    const closed$ = new Subject<true>();
    const close = () => {
      closed$.next(true);
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
        />
      ),
      {
        ownFocus: true,
        'data-test-subj': 'createDrilldownFlyout',
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
