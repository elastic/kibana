/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { hasExponentialHistogramMapping } from './has_exponential_histogram_mapping';

describe('hasExponentialHistogramMapping', () => {
  const baseParams = {
    eventType: ProcessorEvent.metric,
    durationField: 'transaction.duration.histogram',
  };

  it('returns false when the field is not mapped', async () => {
    const apmEventClient = {
      fieldCaps: jest.fn().mockResolvedValue({ fields: {} }),
    } as unknown as APMEventClient;

    await expect(hasExponentialHistogramMapping({ ...baseParams, apmEventClient })).resolves.toBe(
      false
    );
  });

  it('returns false for classic histogram mappings', async () => {
    const apmEventClient = {
      fieldCaps: jest.fn().mockResolvedValue({
        fields: {
          'transaction.duration.histogram': {
            histogram: { type: 'histogram' },
          },
        },
      }),
    } as unknown as APMEventClient;

    await expect(hasExponentialHistogramMapping({ ...baseParams, apmEventClient })).resolves.toBe(
      false
    );
  });

  it('returns true when any mapping is exponential_histogram', async () => {
    const apmEventClient = {
      fieldCaps: jest.fn().mockResolvedValue({
        fields: {
          'transaction.duration.histogram': {
            histogram: { type: 'histogram' },
            exponential_histogram: { type: 'exponential_histogram' },
          },
        },
      }),
    } as unknown as APMEventClient;

    await expect(hasExponentialHistogramMapping({ ...baseParams, apmEventClient })).resolves.toBe(
      true
    );
  });

  it('requests empty-field mappings without a time filter', async () => {
    const apmEventClient = {
      fieldCaps: jest.fn().mockResolvedValue({ fields: {} }),
    } as unknown as APMEventClient;

    await hasExponentialHistogramMapping({ ...baseParams, apmEventClient });

    expect(apmEventClient.fieldCaps).toHaveBeenCalledWith('get_duration_field_caps', {
      apm: { events: [ProcessorEvent.metric] },
      fields: ['transaction.duration.histogram'],
      include_empty_fields: true,
    });
  });
});
