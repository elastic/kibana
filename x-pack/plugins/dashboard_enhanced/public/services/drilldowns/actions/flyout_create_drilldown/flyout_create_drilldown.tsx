/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionByType } from '../../../../../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { isEnhancedEmbeddable } from '../../../../../../embeddable_enhanced/public';
import { EmbeddableContext } from '../../../../../../../../src/plugins/embeddable/public';
import { StartDependencies } from '../../../../plugin';
import { StartServicesGetter } from '../../../../../../../../src/plugins/kibana_utils/public';

export const OPEN_FLYOUT_ADD_DRILLDOWN = 'OPEN_FLYOUT_ADD_DRILLDOWN';

export interface OpenFlyoutAddDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export class FlyoutCreateDrilldownAction implements ActionByType<typeof OPEN_FLYOUT_ADD_DRILLDOWN> {
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

  private isEmbeddableCompatible(context: EmbeddableContext) {
    if (!isEnhancedEmbeddable(context.embeddable)) return false;
    const supportedTriggers = context.embeddable.supportedTriggers();
    if (!supportedTriggers || !supportedTriggers.length) return false;
    if (context.embeddable.getRoot().type !== 'dashboard') return false;

    return supportedTriggers.indexOf('VALUE_CLICK_TRIGGER') > -1;
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
        />
      ),
      {
        ownFocus: true,
        'data-test-subj': 'createDrilldownFlyout',
      }
    );
  }
}
