/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type {
  PluginSetupContract as AlertingSetupContract,
  PluginStartContract as AlertingStartContract,
} from '@kbn/alerting-plugin/public';
import type { ObservabilityServiceFlyoutFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';

const LazyServiceFlyout = dynamic(() => import('.').then((m) => ({ default: m.ServiceFlyout })));

export function createServiceFlyoutRenderer({
  share,
  core,
  lens,
  dataViews,
  alerting,
}: {
  share: SharePublicStart;
  core: CoreStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  alerting?: AlertingStartContract;
}) {
  return (deps: ObservabilityServiceFlyoutFeatureRenderDeps): React.ReactNode => (
    <LazyServiceFlyout
      deps={{
        share,
        core,
        lens,
        dataViews,
        alerting: alerting as AlertingSetupContract | undefined,
      }}
      service={{ name: deps.serviceName, agentName: deps.agentName }}
      filters={{
        environment: deps.environment,
        rangeFrom: deps.rangeFrom,
        rangeTo: deps.rangeTo,
      }}
      historyKey={deps.flyoutHistoryKey}
      onClose={deps.onClose}
    />
  );
}
