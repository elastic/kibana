/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSkeletonText } from '@elastic/eui';

import { withSuspense } from '@kbn/shared-ux-utility';

/**
 * Lazy-wrapped LogRateAnalysisAppState React component
 */
export const LogRateAnalysis = withSuspense(
  React.lazy(() => import('./components/log_rate_analysis')),
  <EuiSkeletonText lines={3} />
);

/**
 * Lazy-wrapped LogRateAnalysisContentWrapperReact component which to run the analysis.
 */
export const LogRateAnalysisContent = withSuspense(
  React.lazy(() => import('./components/log_rate_analysis/log_rate_analysis_content')),
  <EuiSkeletonText lines={3} />
);

/**
 * Lazy-wrapped LogCategorizationAppStateProps React component
 */
export const LogCategorization = withSuspense(
  React.lazy(() => import('./components/log_categorization')),
  <EuiSkeletonText lines={3} />
);

/**
 * Lazy-wrapped LogCategorizationForDiscoverWrapper React component
 */
export const LogCategorizationForDiscover = withSuspense(
  React.lazy(
    () =>
      import(
        './components/log_categorization/log_categorization_for_embeddable/log_categorization_for_discover_wrapper'
      )
  ),
  <EuiSkeletonText lines={3} />
);

/**
 * Lazy-wrapped ChangePointDetectionAppStateProps React component
 * @param {ChangePointDetectionAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const ChangePointDetection = withSuspense(
  React.lazy(() => import('./components/change_point_detection')),
  <EuiSkeletonText lines={3} />
);
