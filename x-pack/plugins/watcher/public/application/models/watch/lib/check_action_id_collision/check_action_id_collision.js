/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash';

export function checkActionIdCollision(actions, action) {
  const collision = find(actions, { id: action.id });

  return Boolean(collision);
}
