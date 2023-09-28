/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SpanOptions } from '@kbn/apm-utils';
import { withSpan } from '@kbn/apm-utils';
import type agent from 'elastic-apm-node';
import { APP_ID } from '../../common/constants';
import { RulePhase } from '../lib/detection_engine/rule_types/types';
import type { DurationMetrics } from '../lib/detection_engine/rule_types/types';
import { makeFloatString } from '../lib/detection_engine/rule_types/utils/utils';

type Span = Exclude<typeof agent.currentSpan, undefined | null>;

/**
 * This is a thin wrapper around withSpan from @kbn/apm-utils, which sets
 * span type to Security APP_ID by default. This span type is used to
 * distinguish Security spans from everything else when inspecting traces.
 *
 * Use this method to capture information about the execution of a specific
 * code path and highlight it in APM IU.
 *
 * @param optionsOrName Span name or span options object
 * @param cb Code block you want to measure
 *
 * @returns Whatever the measured code block returns
 */
export const withSecuritySpan = async <T>(
  optionsOrName: SpanOptions | string,
  durationMetrics: DurationMetrics[],
  cb: (span?: Span) => Promise<T>
) => {
  const start = performance.now();
  const result = await withSpan<T>(
    {
      type: APP_ID,
      ...(typeof optionsOrName === 'string' ? { name: optionsOrName } : optionsOrName),
    },
    cb
  );
  const end = performance.now();
  if (
    typeof optionsOrName === 'string' &&
    Object.values(RulePhase).includes(optionsOrName as RulePhase)
  ) {
    durationMetrics.push({
      phaseName: optionsOrName as RulePhase,
      duration: makeFloatString(end - start),
    });
  }
  return result;
};
