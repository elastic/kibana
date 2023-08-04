/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnabledFeatures } from '@kbn/spaces-plugin/public/management/edit_space/enabled_features';
import {
  RESPONSE_ACTION_TYPES,
  SUPPORTED_RESPONSE_ACTION_TYPES,
} from '../../../common/api/detection_engine/model/rule_response_actions';

export interface ResponseActionType {
  id: RESPONSE_ACTION_TYPES;
  name: string;
  iconClass: string;
  disabled?: boolean;
}

interface EnabledFeatures {
  endpoint: boolean;
}

export const getSupportedResponseActions = (
  actionTypes: ResponseActionType[],
  enabledFeatures: EnabledFeatures,
  userPermissions: EnabledFeatures
): ResponseActionType[] =>
  actionTypes.reduce((acc: ResponseActionType[], actionType) => {
    const isEndpointAction = actionType.id === RESPONSE_ACTION_TYPES.ENDPOINT;
    if (!enabledFeatures.endpoint && isEndpointAction) return acc;
    if (SUPPORTED_RESPONSE_ACTION_TYPES.includes(actionType.id))
      return [
        ...acc,
        { ...actionType, disabled: isEndpointAction ? !userPermissions.endpoint : undefined },
      ];
    return acc;
  }, []);

export const responseActionTypes = [
  {
    id: RESPONSE_ACTION_TYPES.OSQUERY,
    name: 'Osquery',
    iconClass: 'logoOsquery',
  },
  {
    id: RESPONSE_ACTION_TYPES.ENDPOINT,
    name: 'Endpoint Security',
    iconClass: 'logoSecurity',
  },
];
