/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import { buildFilter } from '../../client/utils';
import { CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { getCountsAndMaxData } from './utils';

export const getUserCommentsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['comments']> => {
  const onlyUserCommentsFilter = buildFilter({
    filters: ['user'],
    field: 'type',
    operator: 'or',
    type: CASE_COMMENT_SAVED_OBJECT,
  });

  const res = await getCountsAndMaxData({
    savedObjectsClient,
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
    filter: onlyUserCommentsFilter,
  });

  return res;
};
