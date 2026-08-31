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
import type { PluginStartContract as AlertingStartContract } from '@kbn/alerting-plugin/public';
import type { ObservabilityServiceFlyoutFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import { createCallApmApi } from '../../../services/rest/create_call_apm_api';
import type { ServiceFlyoutTelemetry, ServiceFlyoutService } from '.';

const LazyServiceFlyout = dynamic(() => import('.').then((m) => ({ default: m.ServiceFlyout })));

export function createServiceFlyoutRenderer({
  share,
  core,
  lens,
  dataViews,
  alerting,
  telemetryClient,
}: {
  share: SharePublicStart;
  core: CoreStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  alerting?: AlertingStartContract;
  telemetryClient: ServiceFlyoutTelemetry['client'];
}) {
  // Discover (and other off-app hosts) never mount the APM application, so the
  // legacy module-level callApmApi is uninitialized. Same pattern as embeddables.
  createCallApmApi(core);

  return (deps: ObservabilityServiceFlyoutFeatureRenderDeps): React.ReactNode => (
    <LazyServiceFlyout
      deps={{
        share,
        core,
        lens,
        dataViews,
        alerting,
      }}
      contextActions={deps.contextActions}
      service={deps.service as ServiceFlyoutService}
      filters={deps.filters}
      telemetry={{ client: telemetryClient, source: deps.source }}
      historyKey={deps.flyoutHistoryKey}
      onClose={deps.onClose}
    />
  );
}
