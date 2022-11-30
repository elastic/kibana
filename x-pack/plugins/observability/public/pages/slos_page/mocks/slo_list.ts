/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOList } from '../../../typings';

export const emptySloList: SLOList = {
  results: [],
  page: 1,
  perPage: 25,
  total: 0,
};
