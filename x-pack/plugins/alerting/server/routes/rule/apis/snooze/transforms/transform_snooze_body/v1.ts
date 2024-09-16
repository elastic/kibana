/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { snoozeBodySchemaV1 } from '../../../../../schemas/rule/apis/snooze';

type SnoozeBodySchema = TypeOf<typeof snoozeBodySchemaV1>;

export const transformSnoozeBody: (opts: SnoozeBodySchema) => {
  snoozeSchedule: SnoozeBodySchema['snooze_schedule'];
} = ({ snooze_schedule: snoozeSchedule }) => ({
  snoozeSchedule,
});
