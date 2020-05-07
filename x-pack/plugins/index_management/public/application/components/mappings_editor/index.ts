/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './mappings_editor';

// We export both the button & the load mappings provider
// to give flexibility to the consumer
export * from './components/load_mappings';

export { OnUpdateHandler, Types } from './mappings_state';
