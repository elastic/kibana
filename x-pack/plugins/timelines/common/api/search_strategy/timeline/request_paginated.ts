/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { pagination } from '../model/pagination';
import { timerange } from '../model/timerange';

export const requestPaginated = z.object({
  defaultIndex: z.array(z.string()),
  pagination,
  timerange,
});
