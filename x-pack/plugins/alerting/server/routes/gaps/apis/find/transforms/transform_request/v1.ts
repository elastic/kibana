/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { FindGapsRequestQueryV1 } from '../../../../../../../common/routes/gaps/apis/find';
import { FindGapsParams } from '../../../../../../lib/rule_gaps/types';

export const transformRequest = ({
  end,
  page,
  per_page,
  rule_id,
  start,
  sort_field,
  sort_order,
}: FindGapsRequestQueryV1): FindGapsParams => ({
  end,
  page,
  perPage: per_page,
  ruleId: rule_id,
  start,
  sortField: sort_field,
  sortOrder: sort_order,
});
