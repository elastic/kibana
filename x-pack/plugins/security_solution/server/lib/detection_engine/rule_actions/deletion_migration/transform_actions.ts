/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, AlertingActions } from './types';

export const transformActions = ({
  actions,
  actionsCountInReferences,
}: {
  actions: Actions[];
  actionsCountInReferences: number;
}) => {
  return actions.map<AlertingActions>((action, index) => {
    const { action_type_id: actionTypeId, id, ...rest } = action;
    return { ...rest, actionTypeId, actionRef: `action_${actionsCountInReferences + index}` };
  });
};
