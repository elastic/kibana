/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Embeddable, IContainer, ContainerInput } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/data-plugin/public';
import { TimeRangeInput } from './custom_time_range_action';

interface ContainerTimeRangeInput extends ContainerInput<TimeRangeInput> {
  timeRange: TimeRange;
}

export function canInheritTimeRange(embeddable: Embeddable<TimeRangeInput>) {
  if (!embeddable.parent) {
    return false;
  }

  const parent = embeddable.parent as IContainer<TimeRangeInput, ContainerTimeRangeInput>;

  return parent.getInput().timeRange !== undefined;
}
