/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteRequestCase } from '../../../../../../lib';
import { ScheduleBackfillOptions } from '../../../../../../../application/rule/methods/backfill/schedule/types';

export const transformRequest: RewriteRequestCase<ScheduleBackfillOptions> = ({
  rule_ids: ruleIds,
  start,
  end,
  dependencies,
}) => ({
  start,
  ruleIds,
  ...(end ? { end } : {}),
  ...(dependencies
    ? {
        dependencies: dependencies.map(({ space_id: spaceId, id }) => ({
          id,
          ...(spaceId ? { spaceId } : {}),
        })),
      }
    : {}),
});
