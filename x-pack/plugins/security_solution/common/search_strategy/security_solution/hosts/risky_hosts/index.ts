/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Inspect, Maybe, RequestBasicOptions } from '../../..';
import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

export type HostsRiskyHostsRequestOptions = RequestBasicOptions;

export interface HostsRiskyHostsStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
}
