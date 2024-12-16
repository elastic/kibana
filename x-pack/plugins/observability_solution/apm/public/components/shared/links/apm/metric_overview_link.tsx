/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { APMQueryParams } from '../url_helpers';
import type { APMLinkExtendProps } from './apm_link';
import { LegacyAPMLink, useAPMHref } from './apm_link';

const persistedFilters: Array<keyof APMQueryParams> = [
  'host',
  'containerId',
  'podName',
  'serviceVersion',
];

export function useMetricOverviewHref(serviceName: string) {
  return useAPMHref({
    path: `/services/${serviceName}/metrics`,
    persistedFilters,
  });
}

interface Props extends APMLinkExtendProps {
  serviceName: string;
}

export function MetricOverviewLink({ serviceName, ...rest }: Props) {
  return <LegacyAPMLink path={`/services/${serviceName}/metrics`} {...rest} />;
}
