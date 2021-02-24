/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const OverviewFiltersType = t.partial({
  locations: t.array(t.string),
  ports: t.array(t.number),
  schemes: t.array(t.string),
  tags: t.array(t.string),
});

export type OverviewFilters = t.TypeOf<typeof OverviewFiltersType>;
