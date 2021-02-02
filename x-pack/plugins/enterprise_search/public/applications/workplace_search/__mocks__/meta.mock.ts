/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_META } from '../../shared/constants';

export const meta = {
  ...DEFAULT_META,
  page: {
    current: 1,
    size: 5,
    total_results: 50,
    total_pages: 5,
  },
};
