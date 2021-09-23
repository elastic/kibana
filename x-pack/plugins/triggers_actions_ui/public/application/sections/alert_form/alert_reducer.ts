/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttribute } from 'kibana/public';
import { isEqual } from 'lodash';
import { Reducer } from 'react';
import { AlertActionParam, IntervalSchedule } from '../../../../../alerting/common';
import { Alert, AlertAction } from '../../../types';

export type InitialAlert = Partial<Alert> &
  Pick<Alert, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags' | 'notifyWhen'>;

interface CommandType<
  T extends
    | 'setAlert'
    | 'setProperty'
    | 'setScheduleProperty'
    | 'setAlertParams'
    | 'setAlertActionParams'
    | 'setAlertActionProperty'
> {
  type: T;
}

export interface AlertState {
  alert: InitialAlert;
}

interface Payload<Keys, Value> {
  key: Keys;
  value: Value;
  index?: number;
}

interface AlertPayload<Key extends keyof Alert> {
  key: Key;
  value: Alert[Key] | null;
  index?: number;
}

interface AlertActionPayload<Key extends keyof AlertAction> {
  key: Key;
  value: AlertAction[Key] | null;
  index?: number;
}

interface AlertSchedulePayload<Key extends keyof IntervalSchedule> {
  key: Key;
  value: IntervalSchedule[Key];
  index?: number;
}

export type AlertReducerAction =
  | {
      command: CommandType<'setAlert'>;
      payload: Payload<'alert', InitialAlert>;
    }
  | {
      command: CommandType<'setProperty'>;
      payload: AlertPayload<keyof Alert>;
    }
  | {
      command: CommandType<'setScheduleProperty'>;
      payload: AlertSchedulePayload<keyof IntervalSchedule>;
    }
  | {
      command: CommandType<'setAlertParams'>;
      payload: Payload<string, unknown>;
    }
  | {
      command: CommandType<'setAlertActionParams'>;
      payload: Payload<string, AlertActionParam>;
    }
  | {
      command: CommandType<'setAlertActionProperty'>;
      payload: AlertActionPayload<keyof AlertAction>;
    };

export type InitialAlertReducer = Reducer<{ alert: InitialAlert }, AlertReducerAction>;
export type ConcreteAlertReducer = Reducer<{ alert: Alert }, AlertReducerAction>;

export const alertReducer = <AlertPhase extends InitialAlert | Alert>(
  state: { alert: AlertPhase },
  action: AlertReducerAction
) => {
  const { alert } = state;

  switch (action.command.type) {
    case 'setAlert': {
      const { key, value } = action.payload as Payload<'alert', AlertPhase>;
      if (key === 'alert') {
        return {
          ...state,
          alert: value,
        };
      } else {
        return state;
      }
    }
    case 'setProperty': {
      const { key, value } = action.payload as AlertPayload<keyof Alert>;
      if (isEqual(alert[key], value)) {
        return state;
      } else {
        return {
          ...state,
          alert: {
            ...alert,
            [key]: value,
          },
        };
      }
    }
    case 'setScheduleProperty': {
      const { key, value } = action.payload as AlertSchedulePayload<keyof IntervalSchedule>;
      if (alert.schedule && isEqual(alert.schedule[key], value)) {
        return state;
      } else {
        return {
          ...state,
          alert: {
            ...alert,
            schedule: {
              ...alert.schedule,
              [key]: value,
            },
          },
        };
      }
    }
    case 'setAlertParams': {
      const { key, value } = action.payload as Payload<string, Record<string, unknown>>;
      if (isEqual(alert.params[key], value)) {
        return state;
      } else {
        return {
          ...state,
          alert: {
            ...alert,
            params: {
              ...alert.params,
              [key]: value,
            },
          },
        };
      }
    }
    case 'setAlertActionParams': {
      const { key, value, index } = action.payload as Payload<
        keyof AlertAction,
        SavedObjectAttribute
      >;
      if (
        index === undefined ||
        alert.actions[index] == null ||
        (!!alert.actions[index][key] && isEqual(alert.actions[index][key], value))
      ) {
        return state;
      } else {
        const oldAction = alert.actions.splice(index, 1)[0];
        const updatedAction = {
          ...oldAction,
          params: {
            ...oldAction.params,
            [key]: value,
          },
        };
        alert.actions.splice(index, 0, updatedAction);
        return {
          ...state,
          alert: {
            ...alert,
            actions: [...alert.actions],
          },
        };
      }
    }
    case 'setAlertActionProperty': {
      const { key, value, index } = action.payload as AlertActionPayload<keyof AlertAction>;
      if (index === undefined || isEqual(alert.actions[index][key], value)) {
        return state;
      } else {
        const oldAction = alert.actions.splice(index, 1)[0];
        const updatedAction = {
          ...oldAction,
          [key]: value,
        };
        alert.actions.splice(index, 0, updatedAction);
        return {
          ...state,
          alert: {
            ...alert,
            actions: [...alert.actions],
          },
        };
      }
    }
  }
};
