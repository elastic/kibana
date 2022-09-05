/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';

type TimelineEventsDetailsItemWithValues = TimelineEventsDetailsItem & {
  values: string[];
};

/**
 * Checks if the `item` has a non-empty `values` array
 */
export function hasData(
  item?: TimelineEventsDetailsItem
): item is TimelineEventsDetailsItemWithValues {
  return Boolean(item && item.values && item.values.length);
}
