/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'src/core/public';
import { ActionByType } from '../../../../../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { DrilldownsStart } from '../../../../../../drilldowns/public';
import { isEnhancedEmbeddable } from '../../../../../../embeddable_enhanced/public';
import { EmbeddableContext } from '../../../../../../../../src/plugins/embeddable/public';

export const OPEN_FLYOUT_ADD_DRILLDOWN = 'OPEN_FLYOUT_ADD_DRILLDOWN';

export interface OpenFlyoutAddDrilldownParams {
  overlays: () => CoreStart['overlays'];
  drilldowns: () => DrilldownsStart;
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
    return supportedTriggers.indexOf('VALUE_CLICK_TRIGGER') > -1;
  }

  public async isCompatible(context: EmbeddableContext) {
    const isEditMode = context.embeddable.getInput().viewMode === 'edit';
    return isEditMode && this.isEmbeddableCompatible(context);
  }

  public async execute(context: EmbeddableContext) {
    const overlays = this.params.overlays();
    const drilldowns = this.params.drilldowns();
    const { embeddable } = context;

    if (!isEnhancedEmbeddable(embeddable)) {
      throw new Error(
        'Need embeddable to be EnhancedEmbeddable to execute FlyoutCreateDrilldownAction.'
      );
    }

    const handle = overlays.openFlyout(
      toMountPoint(
        <drilldowns.FlyoutManageDrilldowns
          onClose={() => handle.close()}
          placeContext={context}
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
