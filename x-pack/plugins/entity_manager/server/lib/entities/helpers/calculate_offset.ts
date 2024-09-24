/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import moment from 'moment';
import {
  ENTITY_DEFAULT_HISTORY_FREQUENCY,
  ENTITY_DEFAULT_HISTORY_SYNC_DELAY,
} from '../../../../common/constants_entities';

const durationToSeconds = (dateMath: string) => {
  const parts = dateMath.match(/(\d+)([m|s|h|d])/);
  if (!parts) {
    throw new Error(`Invalid date math supplied: ${dateMath}`);
  }
  const value = parseInt(parts[1], 10);
  const unit = parts[2] as 'm' | 's' | 'h' | 'd';
  return moment.duration(value, unit).asSeconds();
};

export function calculateOffset(definition: EntityDefinition) {
  const syncDelay = durationToSeconds(
    definition.history.settings.syncDelay || ENTITY_DEFAULT_HISTORY_SYNC_DELAY
  );
  const frequency =
    durationToSeconds(definition.history.settings.frequency || ENTITY_DEFAULT_HISTORY_FREQUENCY) *
    2;

  return syncDelay + frequency;
}
