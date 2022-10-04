/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EncryptedSyntheticsSavedMonitor, Ping } from '../../../../../common/runtime_types';

/**
 * Checks if the loaded/cached pings are of the current selected monitors
 */
export function checkIsStalePing(
  monitor: EncryptedSyntheticsSavedMonitor | null,
  ping: Ping | undefined
) {
  if (!monitor?.id || !ping?.monitor?.id) {
    return true;
  }

  return monitor.id !== ping.monitor.id && monitor.id !== ping.config_id;
}
