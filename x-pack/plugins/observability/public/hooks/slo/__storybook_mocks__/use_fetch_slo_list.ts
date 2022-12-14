/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sloList } from '../../../../common/data/slo';
import { UseFetchSloListResponse } from '../use_fetch_slo_list';

export const useFetchSloList = (name?: string): UseFetchSloListResponse => {
  return {
    loading: false,
    sloList,
  };
};
