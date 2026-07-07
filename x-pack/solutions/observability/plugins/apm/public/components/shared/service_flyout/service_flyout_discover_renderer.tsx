/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ObservabilityTracesServiceFlyoutFeatureRenderProps } from '@kbn/discover-shared-plugin/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { ServiceFlyout } from '.';

interface ServiceFlyoutDiscoverRendererProps
  extends ObservabilityTracesServiceFlyoutFeatureRenderProps {
  core: CoreStart;
  // share is typed as any — it bridges APM's setup-phase type with Discover's start-phase dep.
  // Clean this up when the flyout moves to @kbn/apm-ui-shared.
  share: any;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}

export function ServiceFlyoutDiscoverRenderer({
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
  onClose,
  core,
  share,
  lens,
  dataViews,
}: ServiceFlyoutDiscoverRendererProps) {
  const service = { id: serviceName };

  return (
    <ServiceFlyout
      service={service}
      environment={environment || ENVIRONMENT_ALL.value}
      kuery=""
      initialRangeFrom={rangeFrom}
      initialRangeTo={rangeTo}
      core={core}
      share={share}
      lens={lens}
      dataViews={dataViews}
      onClose={onClose}
    />
  );
}
