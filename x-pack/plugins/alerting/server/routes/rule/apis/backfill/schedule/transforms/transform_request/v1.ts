/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteRequestCase } from '../../../../../../lib';
import { ScheduleBackfillOptions } from '../../../../../../../application/rule/methods/backfill/schedule/types';

export const transformRequest: RewriteRequestCase<ScheduleBackfillOptions> = ({
  ids,
  start,
  end,
}) => ({
  start,
  ids: ids.map(({ rule_id: ruleId, doc_id: docId }) => ({ ruleId, ...(docId ? { docId } : {}) })),
  ...(end ? { end } : {}),
});
