/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'src/core/public';
import { Action } from '../../../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import { FormCreateDrilldown } from '../../components/form_create_drilldown';

export const OPEN_FLYOUT_EDIT_DRILLDOWN = 'OPEN_FLYOUT_EDIT_DRILLDOWN';

interface ActionContext {
  embeddable: IEmbeddable;
}

export interface FlyoutEditDrilldownParams {
  overlays: () => Promise<CoreStart['overlays']>;
}

export class FlyoutEditDrilldownAction implements Action<ActionContext> {
  public readonly type = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public order = 100;

  constructor(protected readonly params: FlyoutEditDrilldownParams) {}

  public getDisplayName() {
    return i18n.translate('xpack.drilldowns.panel.openFlyoutEditDrilldown.displayName', {
      defaultMessage: 'Manage drilldowns',
    });
  }

  public getIconType() {
    return 'list';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return embeddable.getInput().viewMode === 'edit';
  }

  public async execute({ embeddable }: ActionContext) {
    const overlays = await this.params.overlays();
    overlays.openFlyout(toMountPoint(<FormCreateDrilldown />));
  }
}
