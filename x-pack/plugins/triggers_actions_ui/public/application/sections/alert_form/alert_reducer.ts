/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';

interface CommandType {
  type:
    | 'setAlert'
    | 'setProperty'
    | 'setScheduleProperty'
    | 'setAlertParams'
    | 'setAlertActionParams'
    | 'setAlertActionProperty';
}

export interface AlertState {
  alert: any;
}

export interface AlertReducerAction {
  command: CommandType;
  payload: {
    key: string;
    value: {};
    index?: number;
  };
}

export const alertReducer = (state: any, action: AlertReducerAction) => {
  const { command, payload } = action;
  const { alert } = state;

  switch (command.type) {
    case 'setAlert': {
      const { key, value } = payload;
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
      const { key, value } = payload;
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
      const { key, value } = payload;
      if (isEqual(alert.schedule[key], value)) {
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
      const { key, value } = payload;
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
      const { key, value, index } = payload;
      if (index === undefined || isEqual(alert.actions[index][key], value)) {
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
      const { key, value, index } = payload;
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
