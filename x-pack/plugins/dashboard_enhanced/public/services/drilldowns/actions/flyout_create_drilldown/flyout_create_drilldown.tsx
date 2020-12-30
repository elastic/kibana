/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionByType } from '../../../../../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  isEnhancedEmbeddable,
  embeddableEnhancedDrilldownGrouping,
} from '../../../../../../embeddable_enhanced/public';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableContext,
} from '../../../../../../../../src/plugins/embeddable/public';
import { StartDependencies } from '../../../../plugin';
import { StartServicesGetter } from '../../../../../../../../src/plugins/kibana_utils/public';
import { ensureNestedTriggers } from '../drilldown_shared';

export const OPEN_FLYOUT_ADD_DRILLDOWN = 'OPEN_FLYOUT_ADD_DRILLDOWN';

export interface OpenFlyoutAddDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export class FlyoutCreateDrilldownAction implements ActionByType<typeof OPEN_FLYOUT_ADD_DRILLDOWN> {
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

  private isEmbeddableCompatible(context: EmbeddableContext) {
    if (!isEnhancedEmbeddable(context.embeddable)) return false;
    const supportedTriggers = context.embeddable.supportedTriggers();
    if (!supportedTriggers || !supportedTriggers.length) return false;
    if (context.embeddable.getRoot().type !== 'dashboard') return false;

    /**
     * Check if there is an intersection between all registered drilldowns possible triggers that they could be attached to
     * and triggers that current embeddable supports
     */
    const allPossibleTriggers = this.params
      .start()
      .plugins.uiActionsEnhanced.getActionFactories()
      .map((factory) => factory.supportedTriggers())
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

    const handle = core.overlays.openFlyout(
      toMountPoint(
        <plugins.uiActionsEnhanced.FlyoutManageDrilldowns
          onClose={() => handle.close()}
          viewMode={'create'}
          dynamicActionManager={embeddable.enhancements.dynamicActions}
          triggers={[...ensureNestedTriggers(embeddable.supportedTriggers()), CONTEXT_MENU_TRIGGER]}
          placeContext={{ embeddable }}
        />
      ),
      {
        ownFocus: true,
        'data-test-subj': 'createDrilldownFlyout',
      }
    );
  }
}
