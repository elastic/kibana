/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ObservabilityTracesServiceFlyoutFeatureRenderProps } from '@kbn/discover-shared-plugin/public';

const LazyServiceFlyoutDiscoverRenderer = dynamic(() =>
  import('./service_flyout_discover_renderer').then((mod) => ({
    default: mod.ServiceFlyoutDiscoverRenderer,
  }))
);

export function createLazyServiceFlyoutRenderer({
  core,
  share,
  lens,
  dataViews,
}: {
  core: CoreStart;
  share: SharePluginStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}) {
  return (props: ObservabilityTracesServiceFlyoutFeatureRenderProps) => (
    <LazyServiceFlyoutDiscoverRenderer
      {...props}
      core={core}
      share={share}
      lens={lens}
      dataViews={dataViews}
    />
  );
}
