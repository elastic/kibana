/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../../constants';

export function linkToRepositories() {
  return `#${BASE_PATH}/repositories`;
}

export function linkToRepository(repositoryName) {
  return `#${BASE_PATH}/repositories/${repositoryName}`;
}
