/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  PublicDrilldownManagerProps,
  DrilldownManagerDependencies,
  DrilldownManagerProvider,
} from '../context';
import { DrilldownManager } from './drilldown_manager';

export type PublicDrilldownManagerComponent = React.FC<PublicDrilldownManagerProps>;

export const createPublicDrilldownManager = (
  dependencies: DrilldownManagerDependencies
): PublicDrilldownManagerComponent => {
  const PublicDrilldownManager: PublicDrilldownManagerComponent = (drilldownManagerProps) => {
    return (
      <DrilldownManagerProvider {...dependencies} {...drilldownManagerProps}>
        <DrilldownManager />
      </DrilldownManagerProvider>
    );
  };

  return PublicDrilldownManager;
};
