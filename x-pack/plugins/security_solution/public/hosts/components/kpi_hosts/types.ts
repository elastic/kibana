/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateDateRange } from '../../../common/components/charts/common';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

export interface HostsKpiProps {
  filterQuery?: string;
  from: string;
  to: string;
  indexNames: string[];
  narrowDateRange: UpdateDateRange;
  setQuery: GlobalTimeArgs['setQuery'];
  skip: boolean;
}

export enum HostsKpiChartColors {
  authenticationsSuccess = '#54B399',
  authenticationsFailure = '#E7664C',
  uniqueSourceIps = '#D36086',
  uniqueDestinationIps = '#9170B8',
  hosts = '#6092C0',
}
