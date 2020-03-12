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
import { DrilldownsStartContract } from '../../../../../../drilldowns/public';
import { txtDisplayName } from './i18n';
import { MenuItem } from './menu_item';

export const OPEN_FLYOUT_EDIT_DRILLDOWN = 'OPEN_FLYOUT_EDIT_DRILLDOWN';

export interface FlyoutEditDrilldownParams {
  overlays: () => Promise<CoreStart['overlays']>;
  drilldowns: () => Promise<DrilldownsStartContract>;
}

export class FlyoutEditDrilldownAction implements ActionByType<typeof OPEN_FLYOUT_EDIT_DRILLDOWN> {
  public readonly type = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public order = 1;

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
    if (!embeddable.dynamicActions) return false;

    return (await embeddable.dynamicActions.count()) > 0;
  }

  public async execute(context: EmbeddableContext) {
    const overlays = await this.params.overlays();
    const drilldowns = await this.params.drilldowns();
    const dynamicActionManager = context.embeddable.dynamicActions;
    if (!dynamicActionManager) {
      throw new Error(`Can't execute FlyoutEditDrilldownAction without dynamicActionsManager`);
    }

    const handle = overlays.openFlyout(
      toMountPoint(
        <drilldowns.FlyoutManageDrilldowns
          onClose={() => handle.close()}
          context={context}
          viewMode={'manage'}
          dynamicActionManager={dynamicActionManager}
        />
      )
    );
  }
}
