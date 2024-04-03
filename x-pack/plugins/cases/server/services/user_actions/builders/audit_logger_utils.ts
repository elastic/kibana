/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionAction as Action } from '../../../../common/types/domain';

const actionsToVerbs: Record<Action, string> = {
  add: 'added',
  delete: 'deleted',
  create: 'created',
  push_to_service: 'pushed',
  update: 'changed',
};

export const getPastTenseVerb = (action: Action): string => actionsToVerbs[action];
