/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { Threats } from '../../../../../common/detection_engine/schemas/common/schemas';

import {
  IIndexPattern,
  Filter,
  FilterManager,
} from '../../../../../../../../src/plugins/data/public';

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
  indexPatterns?: IIndexPattern;
  queryLabel?: string;
}

export interface BuildThreatDescription {
  label: string;
  threat: Threats;
}
