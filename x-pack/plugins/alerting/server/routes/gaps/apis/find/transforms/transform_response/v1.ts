/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindGapsResponseBodyV1 } from '../../../../../../../common/routes/gaps/apis/find';

import { Gap } from '../../../../../../lib/rule_gaps/gap';

export const transformResponse = ({
  page,
  perPage,
  total,
  data: gapsData,
}: {
  page: number;
  perPage: number;
  total: number;
  data: Gap[];
}): FindGapsResponseBodyV1 => ({
  page,
  per_page: perPage,
  total,
  data: gapsData.map((gap) => ({
    _id: gap?.meta?._id,
    ...gap.getEsObject(),
  })),
});
