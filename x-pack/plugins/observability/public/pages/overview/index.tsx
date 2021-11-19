/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouteParams } from '../../routes';
import { getBucketSize } from '../../utils/get_bucket_size';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OverviewPage as OldOverviewPage } from './old_overview_page';
import { OverviewPage as NewOverviewPage } from './overview_page';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

export type BucketSize = ReturnType<typeof calculateBucketSize>;
function calculateBucketSize({ start, end }: { start?: number; end?: number }) {
  if (start && end) {
    return getBucketSize({ start, end, minInterval: '60s' });
  }
}

export function OverviewPage(props: Props) {
  const { config } = usePluginContext();

  if (config.unsafe.overviewNext.enabled) {
    return <NewOverviewPage {...props} />;
  } else {
    return <OldOverviewPage {...props} />;
  }
}
