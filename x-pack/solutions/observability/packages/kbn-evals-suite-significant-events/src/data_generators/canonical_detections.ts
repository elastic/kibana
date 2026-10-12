/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection } from '@kbn/significant-events-schema';
import { shiftSnapshotTimestamp } from './replay_into_managed_stream';

const CANONICAL_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export interface ReplayShift {
  maxTimestamp: string;
  replayNow: string;
}

export const canonicalDetectionsFromGroundTruth = ({
  streamName,
  rules,
  shift,
}: {
  streamName: string;
  rules: Array<Partial<Detection>>;
  shift?: ReplayShift;
}): Detection[] =>
  rules.map((rule, index) => {
    const authored = rule['@timestamp'];
    const timestamp =
      authored && shift
        ? shiftSnapshotTimestamp({ timestamp: authored, ...shift })
        : authored ?? CANONICAL_TIMESTAMP;
    return {
      '@timestamp': timestamp,
      detection_id: rule.detection_id ?? `${rule.rule_uuid ?? `rule-${index}`}-canonical-${index}`,
      rule_uuid: rule.rule_uuid ?? `rule-${index}`,
      rule_name: rule.rule_name ?? '',
      stream_name: rule.stream_name ?? streamName,
      change_point_type: rule.change_point_type ?? 'spike',
      p_value: rule.p_value ?? 0.0001,
      // Derived at read time in production; stamped here to mirror the agent's input contract.
      processed: rule.processed ?? false,
    };
  });
