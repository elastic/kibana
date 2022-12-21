/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidFeatureId } from '@kbn/rule-data-utils';

export type QueryLanguageType = 'lucene' | 'kuery';

export interface AlertsSearchBarProps {
  appName: string;
  featureIds: ValidFeatureId[];
  rangeFrom?: string;
  rangeTo?: string;
  query?: string;
  onQueryChange: (query: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query: string;
  }) => void;
}
