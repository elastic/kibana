/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { Inspect, Maybe } from '../../../../common';
import { RequestBasicOptions } from '../../..';

export type NetworkKpiNetworkEventsRequestOptions = RequestBasicOptions;

export interface NetworkKpiNetworkEventsStrategyResponse extends IEsSearchResponse {
  networkEvents: number;
  inspect?: Maybe<Inspect>;
}
