/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_SUPPORTED_ACTION_TYPES_IDS } from '../../../../common/constants';

export interface ResponseActionType {
  id: string;
  name: string;
  iconClass: string;
  description: string;
}

export const getSupportedResponseActions = (
  actionTypes: ResponseActionType[],
  enabledActionsMap: Record<string, boolean>
): ResponseActionType[] => {
  return actionTypes.filter((actionType) => {
    // if (actionType.id === '.osquery' && !enabledActionsMap['.osquery']) {
    //   return false;
    // }
    return RESPONSE_SUPPORTED_ACTION_TYPES_IDS.includes(actionType.id);
  });
};

export const responseActionTypes = [
  {
    id: '.osquery',
    name: 'osquery',
    iconClass: 'logoOsquery',
    description: 'Run Osquery query on each rule execution',
  },
  // { id: '.endpointSecurity', name: 'endpointSecurity', iconClass: 'logoSecurity' },
];
