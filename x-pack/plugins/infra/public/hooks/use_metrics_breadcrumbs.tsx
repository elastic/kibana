/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChromeBreadcrumb } from '../../../../../src/core/public/chrome/types';
import { METRICS_APP } from '../../common/constants';
import { metricsTitle } from '../translations';
import { useBreadcrumbs } from './use_breadcrumbs';

export const useMetricsBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  useBreadcrumbs(METRICS_APP, metricsTitle, extraCrumbs);
};
