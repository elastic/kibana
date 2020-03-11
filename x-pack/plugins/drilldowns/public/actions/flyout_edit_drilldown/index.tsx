/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'src/core/public';
import { EuiNotificationBadge } from '@elastic/eui';
import { ActionByType } from '../../../../../../src/plugins/ui_actions/public';
import {
  toMountPoint,
  reactToUiComponent,
} from '../../../../../../src/plugins/kibana_react/public';
import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import { FormCreateDrilldown } from '../../components/form_create_drilldown';

export const OPEN_FLYOUT_EDIT_DRILLDOWN = 'OPEN_FLYOUT_EDIT_DRILLDOWN';

export interface FlyoutEditDrilldownActionContext {
  embeddable: IEmbeddable;
}

export interface FlyoutEditDrilldownParams {
  overlays: () => Promise<CoreStart['overlays']>;
}

const displayName = i18n.translate('xpack.drilldowns.panel.openFlyoutEditDrilldown.displayName', {
  defaultMessage: 'Manage drilldowns',
});

// mocked data
const drilldrownCount = 2;

export class FlyoutEditDrilldownAction implements ActionByType<typeof OPEN_FLYOUT_EDIT_DRILLDOWN> {
  public readonly type = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_EDIT_DRILLDOWN;
  public order = 100;

  constructor(protected readonly params: FlyoutEditDrilldownParams) {}

  public getDisplayName() {
    return displayName;
  }

  public getIconType() {
    return 'list';
  }

  private ReactComp: React.FC<{ context: FlyoutEditDrilldownActionContext }> = () => {
    return (
      <>
        {displayName}{' '}
        <EuiNotificationBadge color="subdued" style={{ float: 'right' }}>
          {drilldrownCount}
        </EuiNotificationBadge>
      </>
    );
  };

  MenuItem = reactToUiComponent(this.ReactComp);

  public async isCompatible({ embeddable }: FlyoutEditDrilldownActionContext) {
    return embeddable.getInput().viewMode === 'edit' && drilldrownCount > 0;
  }

  public async execute({ embeddable }: FlyoutEditDrilldownActionContext) {
    const overlays = await this.params.overlays();
    overlays.openFlyout(toMountPoint(<FormCreateDrilldown />));
  }
}
