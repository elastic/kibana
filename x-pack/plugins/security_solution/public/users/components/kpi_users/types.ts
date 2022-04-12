/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateDateRange } from '../../../common/components/charts/common';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

export interface UsersKpiProps {
  filterQuery?: string;
  from: string;
  to: string;
  indexNames: string[];
  narrowDateRange: UpdateDateRange;
  setQuery: GlobalTimeArgs['setQuery'];
  skip: boolean;
}
