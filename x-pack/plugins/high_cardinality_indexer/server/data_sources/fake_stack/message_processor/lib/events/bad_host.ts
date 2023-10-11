/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample, random, times, sum } from 'lodash';
import { EventFunction } from '../../../../../types';
import { MESSAGE_PROCESSOR_HOSTS } from '../../../common/constants';
import { createBaseEvent } from './create_base_event';
import { createLatencyHistogram } from './create_latency_histogram';

const badHostSet = new Set<string>();
times(random(4, 8)).forEach(() => {
  badHostSet.add(sample(MESSAGE_PROCESSOR_HOSTS) as string);
});
export const badHosts = [...badHostSet];

export const badHost =
  (all = false): EventFunction =>
  (_schedule, timestamp) => {
    const host = (all ? sample(MESSAGE_PROCESSOR_HOSTS) : badHosts) as string;
    const accepted = random(10, 1000);
    const processed = 0;
    const latency = createLatencyHistogram(accepted, { min: 500, max: 1000 });
    const message = `Processed ${processed} messages out of ${sum(latency.counts)}`;
    return [
      createBaseEvent(
        timestamp,
        'INFO',
        host,
        message,
        sum(latency.counts),
        processed,
        latency,
        'failure'
      ),
    ];
  };
