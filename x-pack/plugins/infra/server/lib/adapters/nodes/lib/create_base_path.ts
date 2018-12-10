/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraPathInput } from '../../../../../common/graphql/types';
export const createBasePath = (groupBy: InfraPathInput[]) => {
  const basePath = ['aggs', 'waffle', 'aggs', 'nodes', 'aggs'];
  return groupBy.reduce((acc, group, index) => {
    return acc.concat([`path_${index}`, `aggs`]);
  }, basePath);
};
