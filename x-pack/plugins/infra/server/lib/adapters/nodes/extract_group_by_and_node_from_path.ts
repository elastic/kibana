/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraPathInput } from '../../../../common/graphql/types';
import { DOMAIN_TO_FIELD } from './constants';
export function extractGroupByAndNodeFromPath(path: InfraPathInput[]) {
  const nodePart = path[path.length - 1];
  const nodeField = DOMAIN_TO_FIELD[nodePart.type];
  const groupBy = path.slice(0, path.length - 1);
  return { nodeField, groupBy };
}
