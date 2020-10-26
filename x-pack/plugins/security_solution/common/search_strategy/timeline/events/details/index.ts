/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../../common';
import { TimelineRequestOptionsPaginated } from '../..';

export interface TimelineEventsDetailsItem {
  field: string;
  values?: Maybe<string[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalValue?: Maybe<any>;
}

export interface TimelineEventsDetailsStrategyResponse extends IEsSearchResponse {
  data?: Maybe<TimelineEventsDetailsItem[]>;
  inspect?: Maybe<Inspect>;
}

export interface TimelineEventsDetailsRequestOptions
  extends Partial<TimelineRequestOptionsPaginated> {
  indexName: string;
  eventId: string;
}
