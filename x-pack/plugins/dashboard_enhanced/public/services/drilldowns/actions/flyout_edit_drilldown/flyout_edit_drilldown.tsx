/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Action } from '../../../../../../../../src/plugins/ui_actions/public';
import {
  reactToUiComponent,
  toMountPoint,
} from '../../../../../../../../src/plugins/kibana_react/public';
import {
  EmbeddableContext,
  ViewMode,
  CONTEXT_MENU_TRIGGER,
} from '../../../../../../../../src/plugins/embeddable/public';
import { txtDisplayName } from './i18n';
import { MenuItem } from './menu_item';
import {
  isEnhancedEmbeddable,
  embeddableEnhancedDrilldownGrouping,
} from '../../../../../../embeddable_enhanced/public';
import { StartDependencies } from '../../../../plugin';
import { StartServicesGetter } from '../../../../../../../../src/plugins/kibana_utils/public';
import { ensureNestedTriggers } from '../drilldown_shared';

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

    const handle = core.overlays.openFlyout(
      toMountPoint(
        <plugins.uiActionsEnhanced.FlyoutManageDrilldowns
          onClose={() => handle.close()}
          viewMode={'manage'}
          dynamicActionManager={embeddable.enhancements.dynamicActions}
          triggers={[...ensureNestedTriggers(embeddable.supportedTriggers()), CONTEXT_MENU_TRIGGER]}
          placeContext={{ embeddable }}
        />
      ),
      {
        ownFocus: true,
        'data-test-subj': 'editDrilldownFlyout',
      }
    );
  }
}
