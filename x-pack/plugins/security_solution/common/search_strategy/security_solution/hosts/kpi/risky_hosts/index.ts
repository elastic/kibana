/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import type { Inspect, Maybe } from '../../../../common';
import type { RequestBasicOptions } from '../../..';

export type HostsKpiRiskyHostsRequestOptions = RequestBasicOptions;

export interface HostsKpiRiskyHostsStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  riskyHosts: {
    [key in HostRiskSeverity]: number;
  };
}

export enum HostRiskSeverity {
  unknown = 'Unknown',
  low = 'Low',
  moderate = 'Moderate',
  high = 'High',
  critical = 'Critical',
}
