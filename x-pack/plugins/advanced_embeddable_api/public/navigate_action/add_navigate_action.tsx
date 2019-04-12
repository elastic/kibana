/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getNewPlatform } from 'ui/new_platform';
import { FlyoutRef } from '../../../../../src/core/public';
import {
  Action,
  ActionContext,
  ViewMode,
  ExecuteActionContext,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { AddNavigateActionFlyout } from './add_navigate_action_flyout';

export const ADD_NAVIGATE_ACTION = 'ADD_NAVIGATE_ACTION';

export class AddNavigateAction extends Action {
  private flyoutSession?: FlyoutRef;

  constructor() {
    super(ADD_NAVIGATE_ACTION);
  }

  public getTitle() {
    return 'Customize flow';
  }

  public isCompatible(context: ActionContext) {
    return Promise.resolve(context.embeddable.getInput().viewMode === ViewMode.EDIT);
  }

  public execute({ embeddable, container }: ExecuteActionContext) {
    if (!embeddable) {
      throw new Error('Navigate action requires an embeddable context to be executed');
    }
    const panelId = embeddable.id;

    this.flyoutSession = getNewPlatform().setup.core.overlays.openFlyout(
      <AddNavigateActionFlyout
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
        size: 'l',
      }
    );
  }
}
