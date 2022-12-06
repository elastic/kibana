/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SUPPORTED_RESPONSE_ACTION_TYPES,
  RESPONSE_ACTION_TYPES,
} from '../../../common/detection_engine/rule_response_actions/schemas';

export interface ResponseActionType {
  id: RESPONSE_ACTION_TYPES;
  name: string;
  iconClass: string;
}

export const getSupportedResponseActions = (
  actionTypes: ResponseActionType[]
): ResponseActionType[] => {
  return actionTypes.filter((actionType) => {
    return SUPPORTED_RESPONSE_ACTION_TYPES.includes(actionType.id);
  });
};

export const responseActionTypes = [
  {
    id: RESPONSE_ACTION_TYPES.OSQUERY,
    name: 'osquery',
    iconClass: 'logoOsquery',
  },
  // { id: '.endpointSecurity', name: 'endpointSecurity', iconClass: 'logoSecurity' },
];
