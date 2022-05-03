/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { Cases } from '../../common/ui';
import { CASE_FIND_URL } from '../../common/constants';
import { CasesFindRequest, CasesFindResponse } from '../../common/api';
import { convertAllCasesToCamel } from './utils';
import { decodeCasesFindResponse } from './decoders';

interface HTTPService {
  http: HttpStart;
}

export const getCases = async ({
  http,
  query,
}: HTTPService & { query: CasesFindRequest }): Promise<Cases> => {
  const res = await http.get<CasesFindResponse>(CASE_FIND_URL, { query });
  return convertAllCasesToCamel(decodeCasesFindResponse(res));
};
