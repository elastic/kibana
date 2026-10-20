/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { eventWithTime } from '@rrweb/types';

/** A single rrweb event as recorded in the browser. */
export type ReplayEvent = eventWithTime;

export interface SessionReplayPlayerProps {
  /** Identity of the recording; changing it resets the player. */
  readonly sessionId: string;
  readonly 'data-test-subj'?: string;
}
