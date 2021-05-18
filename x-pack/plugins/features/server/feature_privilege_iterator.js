/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// the file created to remove TS cicular dependency between features and security pluin
// https://github.com/elastic/kibana/issues/87388
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { featurePrivilegeIterator } from '../../security/server/authorization';
