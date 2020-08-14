/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { setHelpExtension } from '../setHelpExtension';
export { setReadonlyBadge } from '../updateBadge';
export { createCallApmApi } from '../services/rest/createCallApmApi';
export { createStaticIndexPattern } from '../services/rest/index_pattern';
export {
  fetchOverviewPageData,
  hasData,
} from '../services/rest/apm_overview_fetchers';
