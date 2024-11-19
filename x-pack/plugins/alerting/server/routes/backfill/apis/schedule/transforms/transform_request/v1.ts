/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { ScheduleBackfillRequestBodyV1 } from '../../../../../../../common/routes/backfill/apis/schedule';
import { ScheduleBackfillParams } from '../../../../../../application/backfill/methods/schedule/types';

export const transformRequest = (request: ScheduleBackfillRequestBodyV1): ScheduleBackfillParams =>
  request.map(({ rule_id, start, end }) => ({ ruleId: rule_id, start, end }));
