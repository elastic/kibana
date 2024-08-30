/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindBackfillResult } from '../../../../../../application/backfill/methods/find/types';
import { FindBackfillResponseBodyV1 } from '../../../../../schemas/backfill/apis/find';
import { transformBackfillToBackfillResponseV1 } from '../../../../transforms';

export const transformResponse = ({
  page,
  perPage,
  total,
  data: backfillData,
}: FindBackfillResult): FindBackfillResponseBodyV1 => ({
  page,
  per_page: perPage,
  total,
  data: backfillData.map(transformBackfillToBackfillResponseV1),
});
