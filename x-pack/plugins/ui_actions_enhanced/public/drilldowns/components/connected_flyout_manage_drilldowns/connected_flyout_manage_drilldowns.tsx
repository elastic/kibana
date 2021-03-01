/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { ToastsStart } from 'kibana/public';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { Trigger } from '../../../../../../../src/plugins/ui_actions/public';
import type {
  ActionFactory,
  BaseActionFactoryContext,
  DynamicActionManager,
} from '../../../dynamic_actions';
import type { ActionFactoryPlaceContext } from '../types';

interface ConnectedFlyoutManageDrilldownsProps<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> {
  dynamicActionManager: DynamicActionManager;
  viewMode?: 'create' | 'manage';
  onClose?: () => void;

  /**
   * List of possible triggers in current context
   */
  triggers: string[];

  /**
   * Extra action factory context passed into action factories CollectConfig, getIconType, getDisplayName and etc...
   */
  placeContext?: ActionFactoryPlaceContext<ActionFactoryContext>;
}

/**
 * Represent current state (route) of FlyoutManageDrilldowns
 */

export interface CreateFlyoutManageDrilldownsProps {
  actionFactories: ActionFactory[];
  getTrigger: (triggerId: string) => Trigger;
  storage: IStorageWrapper;
  toastService: ToastsStart;
  docsLink?: string;
  triggerPickerDocsLink?: string;
}

const FlyoutManageDrilldownsComponent = React.lazy(
  () => import('./connected_flyout_manage_drilldowns_lazy')
);

export function createFlyoutManageDrilldowns(
  props: CreateFlyoutManageDrilldownsProps
): React.FC<ConnectedFlyoutManageDrilldownsProps> {
  return (componentProps: ConnectedFlyoutManageDrilldownsProps) => {
    return (
      <Suspense fallback={<div />}>
        <FlyoutManageDrilldownsComponent {...{ ...props, ...componentProps }} />
      </Suspense>
    );
  };
}
