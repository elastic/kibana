/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WATCH_TYPES } from '../../constants';
import {
  buildActions,
  buildCondition,
  buildInput,
  buildMetadata,
  buildTransform,
  buildTrigger,
} from './serialization_helpers';

export function serializeThresholdWatch({
  name,
  triggerIntervalSize,
  triggerIntervalUnit,
  index,
  timeWindowSize,
  timeWindowUnit,
  timeField,
  aggType,
  aggField,
  termField,
  termSize,
  termOrder,
  thresholdComparator,
  hasTermsAgg,
  threshold,
  actions,
  includeMetadata = true,
}) {
  const serializedWatch = {
    trigger: buildTrigger(triggerIntervalSize, triggerIntervalUnit),
    input: buildInput({
      index,
      timeWindowSize,
      timeWindowUnit,
      timeField,
      aggType,
      aggField,
      termField,
      termSize,
      termOrder,
    }),
    condition: buildCondition({ aggType, thresholdComparator, hasTermsAgg, threshold }),
    transform: buildTransform({ aggType, thresholdComparator, hasTermsAgg, threshold }),
    actions: buildActions(actions),
  };

  if (includeMetadata) {
    serializedWatch.metadata = {
      xpack: {
        type: WATCH_TYPES.THRESHOLD,
      },
      ...buildMetadata({
        index,
        timeField,
        triggerIntervalSize,
        triggerIntervalUnit,
        aggType,
        aggField,
        termSize,
        termField,
        thresholdComparator,
        timeWindowSize,
        timeWindowUnit,
        threshold,
      }),
    };

    if (name) {
      serializedWatch.metadata.name = name;
    }
  }

  return serializedWatch;
}
