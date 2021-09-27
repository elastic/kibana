/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { DrilldownManagerDependencies, PublicDrilldownManagerProps } from '../../types';

export type PublicDrilldownManagerComponent = React.FC<PublicDrilldownManagerProps>;

const LazyDrilldownManager = React.lazy(() =>
  import('./drilldown_manager_with_provider').then((m) => ({
    default: m.DrilldownManagerWithProvider,
  }))
);

/**
 * This HOC creates a "public" `<DrilldownManager>` component `PublicDrilldownManagerComponent`,
 * which can be exported from plugin contract for other plugins to consume.
 */
export const createPublicDrilldownManager = (
  dependencies: DrilldownManagerDependencies
): PublicDrilldownManagerComponent => {
  const PublicDrilldownManager: PublicDrilldownManagerComponent = (drilldownManagerProps) => {
    return (
      <React.Suspense fallback={null}>
        <LazyDrilldownManager {...dependencies} {...drilldownManagerProps} />
      </React.Suspense>
    );
  };

  return PublicDrilldownManager;
};
