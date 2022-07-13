/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';

export function getDurationField(eventType: ProcessorEvent) {
  switch (eventType) {
    case ProcessorEvent.metric:
      return TRANSACTION_DURATION_HISTOGRAM;
    case ProcessorEvent.span:
      return SPAN_DURATION;
    default:
      return TRANSACTION_DURATION;
  }
}
