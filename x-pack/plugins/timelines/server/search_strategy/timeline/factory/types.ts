/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';
import {
  TimelineFactoryQueryTypes,
  TimelineStrategyRequestType,
  TimelineStrategyResponseType,
} from '../../../../common/search_strategy/timeline';

export interface TimelineFactory<T extends TimelineFactoryQueryTypes> {
  buildDsl: (options: TimelineStrategyRequestType<T>) => unknown;
  parse: (
    options: TimelineStrategyRequestType<T>,
    response: IEsSearchResponse
  ) => Promise<TimelineStrategyResponseType<T>>;
}
