/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { ActionByType } from '../../../../../../../../src/plugins/ui_actions/public';
import {
  reactToUiComponent,
  toMountPoint,
} from '../../../../../../../../src/plugins/kibana_react/public';
import { EmbeddableContext, ViewMode } from '../../../../../../../../src/plugins/embeddable/public';
import { DrilldownsStart } from '../../../../../../drilldowns/public';
import { txtDisplayName } from './i18n';
import { MenuItem } from './menu_item';
import { isEnhancedEmbeddable } from '../../../../../../embeddable_enhanced/public';

export const OPEN_FLYOUT_EDIT_DRILLDOWN = 'OPEN_FLYOUT_EDIT_DRILLDOWN';

export interface FlyoutEditDrilldownParams {
  overlays: () => CoreStart['overlays'];
  drilldowns: () => DrilldownsStart;
}

export class FlyoutEditDrilldownAction implements ActionByType<typeof OPEN_FLYOUT_EDIT_DRILLDOWN> {
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

  MenuItem = reactToUiComponent(MenuItem);

  public async isCompatible({ embeddable }: EmbeddableContext) {
    if (embeddable.getInput().viewMode !== ViewMode.EDIT) return false;
    if (!isEnhancedEmbeddable(embeddable)) return false;
    return embeddable.enhancements.dynamicActions.state.get().events.length > 0;
  }

  public async execute(context: EmbeddableContext) {
    const overlays = this.params.overlays();
    const drilldowns = this.params.drilldowns();
    const { embeddable } = context;

    if (!isEnhancedEmbeddable(embeddable)) {
      throw new Error(
        'Need embeddable to be EnhancedEmbeddable to execute FlyoutEditDrilldownAction.'
      );
    }

    const handle = overlays.openFlyout(
      toMountPoint(
        <drilldowns.FlyoutManageDrilldowns
          onClose={() => handle.close()}
          placeContext={context}
          viewMode={'manage'}
          dynamicActionManager={embeddable.enhancements.dynamicActions}
        />
      ),
      {
        ownFocus: true,
        'data-test-subj': 'dashboardEditDrilldownFlyout',
      }
    );
  }
}
