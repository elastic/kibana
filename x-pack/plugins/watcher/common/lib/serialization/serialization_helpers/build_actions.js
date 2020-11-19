/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { forEach } from 'lodash';
import { Action } from '../../../models/action';

/*
watch.actions
 */
export function buildActions(actions) {
  const result = {};

  forEach(actions, (action) => {
    const actionModel = Action.fromDownstreamJson(action);
    Object.assign(result, actionModel.upstreamJson);
  });

  return result;
}
