/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getNewPlatform } from 'ui/new_platform';
import {
  Action,
  ExecuteActionContext,
  ActionContext,
  ViewMode,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { FlyoutRef } from '../../../../../src/core/public';
import { CustomizeTimeRangeFlyout } from './customize_time_range_flyout';

export const CUSTOMIZE_TIME_RANGE = 'CUSTOMIZE_TIME_RANGE';
export class CustomizeTimeRangeAction extends Action {
  private flyoutSession?: FlyoutRef;

  constructor() {
    super(CUSTOMIZE_TIME_RANGE);
  }

  public getTitle() {
    return 'Customize time range';
  }

  public isCompatible(context: ActionContext) {
    return Promise.resolve(context.embeddable.getInput().viewMode === ViewMode.EDIT);
  }

  public allowTemplateMapping() {
    return false;
  }

  public allowEditing() {
    return false;
  }
  public execute({ embeddable, container }: ExecuteActionContext) {
    const panelId = embeddable.id;

    this.flyoutSession = getNewPlatform().setup.core.overlays.openFlyout(
      <CustomizeTimeRangeFlyout
        panelId={panelId}
        embeddable={embeddable}
        container={container}
        onClose={() => {
          if (this.flyoutSession) {
            this.flyoutSession.close();
          }
        }}
      />,
      {
        'data-test-subj': 'samplePanelActionFlyout',
      }
    );
  }
}
