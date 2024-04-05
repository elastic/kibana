/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These register helper functions have no async imports themselves, so they
// can be bundled together for a single async chunk.
export { registerEmbeddables } from '../embeddables';
export { registerMlUiActions } from '../ui_actions';
export { registerSearchLinks } from './register_search_links';
export { registerCasesAttachments } from '../cases';
