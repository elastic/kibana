/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { FlyoutManageDrilldowns } from '../flyout_manage_drilldowns';
import { ActionFactory, AdvancedUiActionsStart } from '../../../../advanced_ui_actions/public';
import { FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';

interface ConnectedFlyoutManageDrilldownsProps<Context extends object = object> {
  context: Context;
  viewMode?: 'create' | 'manage';
  onClose?: () => void;
}

export function createFlyoutManageDrilldowns({
  advancedUiActions,
}: {
  advancedUiActions: AdvancedUiActionsStart;
}) {
  return (props: ConnectedFlyoutManageDrilldownsProps) => {
    const [compatibleActionFactories, setCompatibleActionFactories] = useState<
      Array<ActionFactory<any>>
    >();
    useEffect(() => {
      async function updateCompatibleFactoriesForContext() {
        const allActionFactories = advancedUiActions.actionFactory.getAll();
        const compatibility = await Promise.all(
          allActionFactories.map(factory => factory.isCompatible(props.context))
        );
        setCompatibleActionFactories(allActionFactories.filter((_, i) => compatibility[i]));
      }
      updateCompatibleFactoriesForContext();
    }, [props.context]);

    if (!compatibleActionFactories) return null;

    switch (props.viewMode) {
      case 'create':
        return (
          <FlyoutDrilldownWizard
            drilldownActionFactories={compatibleActionFactories}
            onClose={props.onClose}
            mode={'create'}
          />
        );

      case 'manage':
      default:
        return (
          <FlyoutManageDrilldowns
            drilldowns={[]}
            drilldownActionFactories={compatibleActionFactories}
            onClose={props.onClose}
          />
        );
    }
  };
}
