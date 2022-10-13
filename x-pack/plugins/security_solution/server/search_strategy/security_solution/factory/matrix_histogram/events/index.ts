/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MatrixHistogramTypeToAggName } from '../../../../../../common/search_strategy';
import { buildEventsHistogramQuery } from './query.events_histogram.dsl';

export const eventsMatrixHistogramConfig = {
  buildDsl: buildEventsHistogramQuery,
  aggName: MatrixHistogramTypeToAggName.events,
  parseKey: 'events.buckets',
};
