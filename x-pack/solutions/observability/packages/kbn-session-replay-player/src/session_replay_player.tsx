/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PLAYER_ARIA_LABEL } from './translations';
import type { SessionReplayPlayerProps } from './types';

export function SessionReplayPlayer({
  sessionId,
  'data-test-subj': dataTestSubj = 'sessionReplayPlayer',
}: SessionReplayPlayerProps) {
  return (
    <section
      aria-label={PLAYER_ARIA_LABEL}
      data-test-subj={dataTestSubj}
      data-session-id={sessionId}
    />
  );
}
