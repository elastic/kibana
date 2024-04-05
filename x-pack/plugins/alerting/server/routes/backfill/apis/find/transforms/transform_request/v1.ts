/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { FindBackfillRequestQueryV1 } from '../../../../../../../common/routes/backfill/apis/find';
import { FindBackfillParams } from '../../../../../../application/backfill/methods/find/types';

export const transformRequest = ({
  end,
  page,
  per_page,
  rule_ids,
  start,
}: FindBackfillRequestQueryV1): FindBackfillParams => ({
  end,
  page,
  perPage: per_page,
  ruleIds: rule_ids,
  start,
});
