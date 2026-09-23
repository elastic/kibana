/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

/** True when any index maps the duration field as exponential_histogram (HDR percentiles are invalid). */
export async function hasExponentialHistogramMapping({
  apmEventClient,
  eventType,
  durationField,
}: {
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent;
  durationField: string;
}): Promise<boolean> {
  // Do not time-filter or skip empty fields: HDR fails on mapping even when
  // matching shards have 0 hits in the selected range.
  const fieldCaps = await apmEventClient.fieldCaps('get_duration_field_caps', {
    apm: { events: [eventType] },
    fields: [durationField],
    include_empty_fields: true,
  });

  const fieldTypes = fieldCaps.fields[durationField];
  if (!fieldTypes) {
    return false;
  }

  return Object.keys(fieldTypes).includes(ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM);
}
