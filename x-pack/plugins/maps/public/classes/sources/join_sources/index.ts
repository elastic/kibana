/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { IJoinSource, ITermJoinSource } from './types';

export { isTermJoinSource } from './types';
export { ESTermSource } from './es_term_source';
export { TableSource } from './table_source';
