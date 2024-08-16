/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

export const convertDataTableRecordToTimelineItem = (
  data: DataTableRecord
): TimelineEventsDetailsItem[] =>
  Object.keys(data.flattened).map((recordKey) => {
    const unknownValue = data.flattened[recordKey];
    // TODO: Fix what we show here
    let value = '-';
    if (typeof unknownValue === 'string') value = unknownValue;
    if (typeof unknownValue === 'number') value = String(unknownValue);

    return {
      ariaRowIndex: data.id,
      category: recordKey.split('.')[0],
      field: recordKey,
      value,
      values: [value],
      originalValue: value,
      isObjectArray: false,
    };
  });
