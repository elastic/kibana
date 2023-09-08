/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataComparisonDetectionAppState,
  type DataComparisonSpec,
} from './data_comparison_app_state';
export { type DataComparisonSpec };
// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default DataComparisonDetectionAppState;
