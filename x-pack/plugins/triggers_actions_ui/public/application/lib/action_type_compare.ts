/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, ActionConnector } from '../../types';

export function actionTypeCompare(
  a: ActionType,
  b: ActionType,
  preconfiguredConnectors?: ActionConnector[]
) {
  const aEnabled = getIsEnabledValue(a, preconfiguredConnectors);
  const bEnabled = getIsEnabledValue(b, preconfiguredConnectors);

  if (aEnabled === true && bEnabled === false) {
    return -1;
  }
  if (aEnabled === false && bEnabled === true) {
    return 1;
  }
  return a.name.localeCompare(b.name);
}

const getIsEnabledValue = (actionType: ActionType, preconfiguredConnectors?: ActionConnector[]) => {
  let isEnabled = actionType.enabled;
  if (
    !actionType.enabledInConfig &&
    preconfiguredConnectors &&
    preconfiguredConnectors.length > 0
  ) {
    isEnabled =
      preconfiguredConnectors.find((connector) => connector.actionTypeId === actionType.id) !==
      undefined;
  }
  return isEnabled;
};
