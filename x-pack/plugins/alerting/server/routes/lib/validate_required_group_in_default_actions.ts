/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

export const validateRequiredGroupInDefaultActions = (
  actions: Array<{ id: string; group?: string }>,
  isSystemAction: (id: string) => boolean
) => {
  const defaultActions = actions.filter((action) => !isSystemAction(action.id));

  for (const action of defaultActions) {
    if (!action.group) {
      throw Boom.badRequest(`Group is not defined in action ${action.id}`);
    }
  }
};
