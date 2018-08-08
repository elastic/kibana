/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { forEach } from 'lodash';

/*
watch.actions
 */
export function buildActions({ actions }) {
  const result = {};

  forEach(actions, (action) => {
    Object.assign(result, action.upstreamJson);
  });

  return result;
}
