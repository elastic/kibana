/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttribute } from '@kbn/core/public';
import { RuleActionParam, RuleActionParams } from '@kbn/alerting-plugin/common';
import { RuleUiAction } from '../../../../types';

interface CommandType<
  T extends 'setNotificationActionParams' | 'initializeNotificationActionParams'
> {
  type: T;
}

export interface ActionParamsState {
  params: Record<string, Record<string, RuleActionParams>>;
}

interface Payload<Keys, Value> {
  key: Keys;
  value: Value;
  connectorId: string;
}

export type ActionReducerAction =
  | {
      command: CommandType<'setNotificationActionParams'>;
      payload: Payload<string, RuleActionParam>;
    }
  | {
      command: CommandType<'initializeNotificationActionParams'>;
      payload: Payload<never, never>;
    };

export const getActionReducer =
  <ParamsPhase extends Record<string, Record<string, RuleActionParams>>>() =>
  (state: { params: ParamsPhase }, action: ActionReducerAction) => {
    switch (action.command.type) {
      case 'setNotificationActionParams': {
        const { params } = state;
        const { key, value, connectorId } = action.payload as Payload<
          keyof RuleUiAction,
          SavedObjectAttribute
        >;
        if (params[connectorId] == null) {
          return state;
        } else {
          const oldParams = params[connectorId];
          const updatedParams = {
            ...oldParams,
            [key]: value,
          };
          return {
            params: {
              ...params,
              [connectorId]: updatedParams,
            },
          };
        }
      }
      case 'initializeNotificationActionParams': {
        const { params } = state;
        const { connectorId } = action.payload as Payload<keyof RuleUiAction, SavedObjectAttribute>;
        if (params[connectorId] == null) {
          return {
            params: {
              ...params,
              [connectorId]: {},
            },
          };
        } else {
          return state;
        }
      }
    }
  };
