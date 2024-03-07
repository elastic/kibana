/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TopMetricsAggForm } from './top_metrics_agg/components/top_metrics_agg_form';
import { TermsAggForm } from './terms_agg/terms_form_component';
import { FilterAggForm } from './filter_agg/components';
import { PercentilesAggForm } from './percentiles_agg/percentiles_form_component';
import { getFilterAggUtils } from './filter_agg/config';
import { getPercentilesAggUtils } from './percentiles_agg/config';
import { getTermsAggUtils } from './terms_agg/config';
import { getTopMetricsAggUtils } from './top_metrics_agg/config';
import {
  isPivotAggsConfigPercentiles,
  type IPivotAggsConfigPercentiles,
} from './percentiles_agg/types';
import { isPivotAggsConfigFilter, type PivotAggsConfigFilter } from './filter_agg/types';
import { isPivotAggsConfigTerms, type IPivotAggsConfigTerms } from './terms_agg/types';
import {
  isPivotAggsConfigTopMetrics,
  type PivotAggsConfigTopMetrics,
} from './top_metrics_agg/types';

export const getAggConfigUtils = (
  config:
    | PivotAggsConfigFilter
    | IPivotAggsConfigPercentiles
    | IPivotAggsConfigTerms
    | PivotAggsConfigTopMetrics
) => {
  if (isPivotAggsConfigFilter(config)) {
    return getFilterAggUtils(config);
  } else if (isPivotAggsConfigPercentiles(config)) {
    return getPercentilesAggUtils(config);
  } else if (isPivotAggsConfigTerms(config)) {
    return getTermsAggUtils(config);
  } else if (isPivotAggsConfigTopMetrics(config)) {
    return getTopMetricsAggUtils(config);
  }
};

export const getAggFormComponent = (
  config:
    | PivotAggsConfigFilter
    | IPivotAggsConfigPercentiles
    | IPivotAggsConfigTerms
    | PivotAggsConfigTopMetrics
) => {
  if (isPivotAggsConfigFilter(config)) {
    return FilterAggForm;
  } else if (isPivotAggsConfigPercentiles(config)) {
    return PercentilesAggForm;
  } else if (isPivotAggsConfigTerms(config)) {
    return TermsAggForm;
  } else if (isPivotAggsConfigTopMetrics(config)) {
    return TopMetricsAggForm;
  }
};

export type AggFormComponent =
  | typeof FilterAggForm
  | typeof PercentilesAggForm
  | typeof TermsAggForm
  | typeof TopMetricsAggForm;
