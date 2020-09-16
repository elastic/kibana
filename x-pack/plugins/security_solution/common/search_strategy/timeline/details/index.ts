/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../common';
import { TimelineRequestOptionsPaginated } from '..';

export interface DetailItem {
  field: string;
  values?: Maybe<string[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalValue?: Maybe<any>;
}

export interface TimelineDetailsStrategyResponse extends IEsSearchResponse {
  data?: Maybe<DetailItem[]>;
  inspect?: Maybe<Inspect>;
}

export interface TimelineDetailsRequestOptions extends Partial<TimelineRequestOptionsPaginated> {
  defaultIndex: string[];
  executeQuery: boolean;
  indexName: string;
  eventId: string;
}
