/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FilterMeta, Filter } from 'src/plugins/data/common';

export interface ExistingFields {
  indexPatternTitle: string;
  existingFieldNames: string[];
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

export interface PersistableFilterMeta extends FilterMeta {
  indexRefName?: string;
}

export interface PersistableFilter extends Filter {
  meta: PersistableFilterMeta;
}
