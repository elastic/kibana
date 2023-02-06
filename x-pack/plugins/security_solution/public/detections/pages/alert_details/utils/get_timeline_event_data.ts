/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';

export const getTimelineEventData = (field: string, data: TimelineEventsDetailsItem[] | null) => {
  const valueArray = data?.find((datum) => datum.field === field)?.values;
  return valueArray && valueArray.length > 0 ? valueArray[0] : '';
};
