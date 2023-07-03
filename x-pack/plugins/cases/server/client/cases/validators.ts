/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesFindRequest } from '../../../common/api';

import { MAX_CASES_PER_PAGE } from '../../../common/constants';
import { validatePagination } from '../../common/validators';

export const validateFindCasesPagination = (params?: CasesFindRequest) => {
  validatePagination({
    page: params?.page,
    perPage: params?.perPage,
    maxPerPage: MAX_CASES_PER_PAGE,
  });
};
