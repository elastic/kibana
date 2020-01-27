/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface UserEnteredResolverPage {
  type: 'userEnteredResolverPage';
}

interface ServerReturnedResolverData {
  type: 'serverReturnedResolverData';
  payload: [];
}

export type ResolverAction = UserEnteredResolverPage | ServerReturnedResolverData;
