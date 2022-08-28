/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateDateRange } from '../../../common/components/charts/common';
import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';

export interface HostsKpiProps {
  filterQuery?: string;
  from: string;
  to: string;
  indexNames: string[];
  updateDateRange: UpdateDateRange;
  setQuery: GlobalTimeArgs['setQuery'];
  skip: boolean;
}

export enum HostsKpiChartColors {
  uniqueSourceIps = '#D36086',
  uniqueDestinationIps = '#9170B8',
  hosts = '#6092C0',
}
