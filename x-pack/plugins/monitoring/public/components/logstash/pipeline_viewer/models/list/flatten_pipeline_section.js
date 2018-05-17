/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flattenDeep } from 'lodash';

export function flattenPipelineSection(pipelineSection, depth, parentId) {
  const list = [];

  pipelineSection.forEach(statement => {
    list.push(statement.toList(depth, parentId));
  });

  return flattenDeep(list);
}
