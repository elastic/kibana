/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

type Separator = 'OR' | 'AND';

export const toKueryFilterFormat = (
  key: string,
  values: string[],
  separator: Separator = 'OR'
) => values.map((value) => `${key} : "${value}"`).join(` ${separator} `);

export const mergeKueries = (filters: string[], separator: Separator = 'AND') =>
  filters.filter((filter) => !isEmpty(filter)).join(` ${separator} `);
