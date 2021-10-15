/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../../common';
import { TimelineRequestOptionsPaginated } from '../..';

export interface TimelineEventsDetailsItem {
  ariaRowindex?: Maybe<number>;
  category?: string;
  field: string;
  values?: Maybe<string[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalValue?: Maybe<any>;
  isObjectArray: boolean;
}

export interface TimelineEventsDetailsStrategyResponse extends IEsSearchResponse {
  data?: Maybe<TimelineEventsDetailsItem[]>;
  inspect?: Maybe<Inspect>;
  rawEventData?: Maybe<object>;
}

export interface TimelineEventsDetailsRequestOptions
  extends Partial<TimelineRequestOptionsPaginated> {
  indexName: string;
  eventId: string;
  authFilter?: JsonObject;
}
