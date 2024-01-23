/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { LogCategorizationAppStateProps } from './log_categorization_app_state';
import { LogCategorizationAppState } from './log_categorization_app_state';
export { createCategorizeFieldAction } from './categorize_field_actions';

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default LogCategorizationAppState;
