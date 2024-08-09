/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnabledFeatures } from '@kbn/spaces-plugin/public/management/edit_space/enabled_features';
import {
  ResponseActionTypes,
  ResponseActionTypesEnum,
} from '../../../common/api/detection_engine/model/rule_response_actions';

export interface ResponseActionType {
  id: ResponseActionTypes;
  name: string;
  iconClass: string;
  disabled?: boolean;
}

interface EnabledFeatures {
  endpoint: boolean;
}

export const getSupportedResponseActions = (
  actionTypes: ResponseActionType[],
  userPermissions: EnabledFeatures
): ResponseActionType[] =>
  actionTypes.reduce((acc: ResponseActionType[], actionType) => {
    const isEndpointAction = actionType.id === ResponseActionTypesEnum['.endpoint'];
    if (ResponseActionTypes.options.includes(actionType.id))
      return [
        ...acc,
        { ...actionType, disabled: isEndpointAction ? !userPermissions.endpoint : undefined },
      ];
    return acc;
  }, []);

export const responseActionTypes: ResponseActionType[] = [
  {
    id: ResponseActionTypesEnum['.osquery'],
    name: 'Osquery',
    iconClass: 'logoOsquery',
  },
  {
    id: ResponseActionTypesEnum['.endpoint'],
    name: 'Elastic Defend',
    iconClass: 'logoSecurity',
  },
];
