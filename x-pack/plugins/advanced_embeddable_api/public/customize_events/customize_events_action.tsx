/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { getNewPlatform } from 'ui/new_platform';
import { FlyoutRef } from '../../../../../src/core/public';
import {
  ExecuteActionContext,
  ActionContext,
  Action,
  ViewMode,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { CustomizeEventsFlyout } from './customize_events_flyout';

export const CUSTOMIZE_EVENTS_ACTION = 'CUSTOMIZE_EVENTS_ACTION';

export class CustomizeEventsAction extends Action {
  private flyoutSession?: FlyoutRef;

  constructor() {
    super(CUSTOMIZE_EVENTS_ACTION);
  }

  public getTitle() {
    return 'Customize events';
  }

  public isCompatible(context: ActionContext) {
    return Promise.resolve(context.embeddable.getInput().viewMode === ViewMode.EDIT);
  }

  public execute({ embeddable, container }: ExecuteActionContext) {
    this.flyoutSession = getNewPlatform().setup.core.overlays.openFlyout(
      <CustomizeEventsFlyout
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
