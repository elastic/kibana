/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { DataViewBase, Filter } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';

export interface ListItems {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export interface BuildQueryBarDescription {
  field: string;
  filters: Filter[];
  filterManager: FilterManager;
  query: string;
  savedId: string;
  indexPatterns?: DataViewBase;
  queryLabel?: string;
}

export interface BuildThreatDescription {
  label: string;
  threat: Threats;
}
