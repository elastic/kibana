/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LogsOverviewDependencies,
  LogsOverviewProps as FullLogsOverviewProps,
} from '@kbn/observability-logs-overview';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';

const LazyLogsOverview = dynamic(() =>
  import('@kbn/observability-logs-overview').then((mod) => ({ default: mod.LogsOverview }))
);

export type LogsOverviewProps = Omit<FullLogsOverviewProps, 'dependencies'>;

export const createLogsOverview =
  (dependencies: LogsOverviewDependencies) => (props: LogsOverviewProps) => {
    return <LazyLogsOverview dependencies={dependencies} {...props} />;
  };
