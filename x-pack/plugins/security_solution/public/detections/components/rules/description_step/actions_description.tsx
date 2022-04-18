/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { startCase } from 'lodash/fp';
import { RuleAction } from '@kbn/alerting-plugin/common';

const ActionsDescription = ({ actions }: { actions: RuleAction[] }) => {
  if (!actions.length) return null;

  return (
    <ul>
      {actions.map((action, index) => (
        <li key={index}>{getActionTypeName(action.actionTypeId)}</li>
      ))}
    </ul>
  );
};

export const buildActionsDescription = (actions: RuleAction[], title: string) => ({
  title: actions.length ? title : '',
  description: <ActionsDescription actions={actions} />,
});

const getActionTypeName = (actionTypeId: RuleAction['actionTypeId']) => {
  if (!actionTypeId) return '';
  const actionType = actionTypeId.split('.')[1];

  if (!actionType) return '';

  return startCase(actionType);
};
