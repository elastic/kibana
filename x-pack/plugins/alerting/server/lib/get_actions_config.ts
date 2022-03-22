/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { ActionsConfig, ActionTypeConfig } from '../config';

export const getActionsConfig = ({
  actionsConfig,
  connectorTypeId,
}: {
  actionsConfig: ActionsConfig;
  connectorTypeId: string;
}): ActionTypeConfig => {
  const connectorTypeConfig = actionsConfig.connectorTypeOverrides?.find(
    (connectorType) => connectorType.id === connectorTypeId
  );
  return {
    ...omit(actionsConfig, 'connectorTypeOverrides'),
    ...omit(connectorTypeConfig, 'id'),
  };
};
