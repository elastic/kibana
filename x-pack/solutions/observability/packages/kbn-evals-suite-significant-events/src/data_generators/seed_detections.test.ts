/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { seedDetections } from './seed_detections';

const log = { warning: jest.fn() } as unknown as ToolingLog;

const detection = {
  '@timestamp': '2026-10-19T09:00:00.000Z',
  detection_id: 'det-1',
  rule_uuid: 'rule-1',
  change_point_type: 'spike' as const,
  p_value: 0.001,
  source_id: 'source-1',
  processed: false,
};

describe('seedDetections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates each detection in the detections data stream, scoped to the space', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });

    await seedDetections({
      esClient: { bulk } as unknown as Client,
      detections: [detection],
      spaceId: 'default',
      log,
    });

    expect(bulk).toHaveBeenCalledWith({
      operations: [
        { create: { _index: '.significant_events-detections' } },
        {
          '@timestamp': '2026-10-19T09:00:00.000Z',
          detection_id: 'det-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.001,
          source_id: 'source-1',
          kibana: { space_ids: ['default'] },
        },
      ],
      refresh: 'wait_for',
    });
  });

  it('logs and goes on when the bulk request fails', async () => {
    const bulk = jest.fn().mockRejectedValue(new Error('no such data stream'));

    await expect(
      seedDetections({
        esClient: { bulk } as unknown as Client,
        detections: [detection],
        spaceId: 'default',
        log,
      })
    ).resolves.toBeUndefined();
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('no such data stream'));
  });
});
