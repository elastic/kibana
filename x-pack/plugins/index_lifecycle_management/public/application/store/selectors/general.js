/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getBootstrapEnabled = (state) => state.general.bootstrapEnabled;
export const getIndexName = (state) => state.general.indexName;
export const getAliasName = (state) => state.general.aliasName;
