/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../../../common';
import { RequestBasicOptions } from '../../..';

export type NetworkKpiDnsRequestOptions = RequestBasicOptions;

export interface NetworkKpiDnsStrategyResponse extends IEsSearchResponse {
  dnsQueries: number;
  inspect?: Maybe<Inspect>;
}
