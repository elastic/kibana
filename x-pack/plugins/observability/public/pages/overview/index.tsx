/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouteParams } from '../../routes';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OverviewPage as OldOverviewPage } from './old_overview_page';
import { OverviewPage as NewOverviewPage } from './overview_page';

export type { BucketSize } from './old_overview_page';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

export function OverviewPage(props: Props) {
  const { config } = usePluginContext();
  const alpha = props.routeParams.query.alpha;

  if (config.unsafe.overviewNext.enabled || alpha) {
    return <NewOverviewPage {...props} />;
  } else {
    return <OldOverviewPage {...props} />;
  }
}
