/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttribute } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { Reducer } from 'react';
import {
  RuleActionParam,
  IntervalSchedule,
  RuleActionAlertsFilterProperty,
  AlertsFilter,
  AlertDelay,
  SanitizedRuleAction,
} from '@kbn/alerting-plugin/common';
import { isEmpty } from 'lodash/fp';
import { ActionTypeRegistryContract, Rule, RuleUiAction } from '../../../types';
import { DEFAULT_FREQUENCY } from '../../../common/constants';

export type InitialRule = Partial<Rule> &
  Pick<Rule, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags'>;

interface CommandType<
  T extends
    | 'setRule'
    | 'setProperty'
    | 'setScheduleProperty'
    | 'setRuleParams'
    | 'setRuleActionParams'
    | 'setRuleActionProperty'
    | 'setRuleActionFrequency'
    | 'setRuleActionAlertsFilter'
    | 'setAlertDelayProperty'
> {
  type: T;
}

export interface RuleState {
  rule: InitialRule;
}

interface Payload<Keys, Value> {
  key: Keys;
  value: Value;
  index?: number;
}

interface RulePayload<Key extends keyof Rule> {
  key: Key;
  value: Rule[Key] | null;
  index?: number;
}

interface RuleActionPayload<Key extends keyof RuleUiAction> {
  key: Key;
  value: RuleUiAction[Key] | null;
  index?: number;
}

interface RuleSchedulePayload<Key extends keyof IntervalSchedule> {
  key: Key;
  value: IntervalSchedule[Key];
  index?: number;
}

interface AlertDelayPayload<Key extends keyof AlertDelay> {
  key: Key;
  value: AlertDelay[Key] | null;
  index?: number;
}

export type RuleReducerAction =
  | {
      command: CommandType<'setRule'>;
      payload: Payload<'rule', InitialRule>;
    }
  | {
      command: CommandType<'setProperty'>;
      payload: RulePayload<keyof Rule>;
    }
  | {
      command: CommandType<'setScheduleProperty'>;
      payload: RuleSchedulePayload<keyof IntervalSchedule>;
    }
  | {
      command: CommandType<'setRuleParams'>;
      payload: Payload<string, unknown>;
    }
  | {
      command: CommandType<'setRuleActionParams'>;
      payload: Payload<string, RuleActionParam>;
    }
  | {
      command: CommandType<'setRuleActionProperty'>;
      payload: Payload<string, RuleActionParam>;
    }
  | {
      command: CommandType<'setRuleActionFrequency'>;
      payload: Payload<string, RuleActionParam>;
    }
  | {
      command: CommandType<'setRuleActionAlertsFilter'>;
      payload: Payload<string, RuleActionAlertsFilterProperty>;
    }
  | {
      command: CommandType<'setAlertDelayProperty'>;
      payload: AlertDelayPayload<keyof AlertDelay>;
    };

export type InitialRuleReducer = Reducer<{ rule: InitialRule }, RuleReducerAction>;
export type ConcreteRuleReducer = Reducer<{ rule: Rule }, RuleReducerAction>;

export const getRuleReducer =
  <RulePhase extends InitialRule | Rule>(actionTypeRegistry: ActionTypeRegistryContract) =>
  (state: { rule: RulePhase }, action: RuleReducerAction) => {
    const { rule } = state;

    switch (action.command.type) {
      case 'setRule': {
        const { key, value } = action.payload as Payload<'rule', RulePhase>;
        if (key === 'rule') {
          return {
            ...state,
            rule: value,
          };
        } else {
          return state;
        }
      }
      case 'setProperty': {
        const { key, value } = action.payload as RulePayload<keyof Rule>;
        if (isEqual(rule[key], value)) {
          return state;
        } else {
          return {
            ...state,
            rule: {
              ...rule,
              [key]: value,
            },
          };
        }
      }
      case 'setScheduleProperty': {
        const { key, value } = action.payload as RuleSchedulePayload<keyof IntervalSchedule>;
        if (rule.schedule && isEqual(rule.schedule[key], value)) {
          return state;
        } else {
          return {
            ...state,
            rule: {
              ...rule,
              schedule: {
                ...rule.schedule,
                [key]: value,
              },
            },
          };
        }
      }
      case 'setRuleParams': {
        const { key, value } = action.payload as Payload<string, Record<string, unknown>>;
        if (isEqual(rule.params[key], value)) {
          return state;
        } else {
          return {
            ...state,
            rule: {
              ...rule,
              params: {
                ...rule.params,
                [key]: value,
              },
            },
          };
        }
      }
      case 'setRuleActionParams': {
        const { key, value, index } = action.payload as Payload<
          keyof RuleUiAction,
          SavedObjectAttribute
        >;
        if (
          index === undefined ||
          rule.actions[index] == null ||
          (!!rule.actions[index][key] && isEqual(rule.actions[index][key], value))
        ) {
          return state;
        } else {
          const oldAction = rule.actions.splice(index, 1)[0];
          const updatedAction = {
            ...oldAction,
            params: {
              ...oldAction.params,
              [key]: value,
            },
          };
          rule.actions.splice(index, 0, updatedAction);
          return {
            ...state,
            rule: {
              ...rule,
              actions: [...rule.actions],
            },
          };
        }
      }
      case 'setRuleActionFrequency': {
        const { key, value, index } = action.payload as Payload<
          keyof RuleUiAction,
          SavedObjectAttribute
        >;
        if (
          index === undefined ||
          rule.actions[index] == null ||
          (!!rule.actions[index][key] && isEqual(rule.actions[index][key], value))
        ) {
          return state;
        } else {
          const oldAction = rule.actions.splice(index, 1)[0];
          if (actionTypeRegistry.get(oldAction.actionTypeId).isSystemActionType) {
            return state;
          }
          const oldSanitizedAction = oldAction as SanitizedRuleAction;
          const updatedAction = {
            ...oldSanitizedAction,
            frequency: {
              ...(oldSanitizedAction?.frequency ?? DEFAULT_FREQUENCY),
              [key]: value,
            },
          };
          rule.actions.splice(index, 0, updatedAction);
          return {
            ...state,
            rule: {
              ...rule,
              actions: [...rule.actions],
            },
          };
        }
      }
      case 'setRuleActionAlertsFilter': {
        const { key, value, index } = action.payload as Payload<
          keyof AlertsFilter,
          RuleActionAlertsFilterProperty
        >;
        if (index === undefined || rule.actions[index] == null) {
          return state;
        } else {
          const oldAction = rule.actions.splice(index, 1)[0];
          if (actionTypeRegistry.get(oldAction.actionTypeId).isSystemActionType) {
            return state;
          }
          const oldSanitizedAction = oldAction as SanitizedRuleAction;
          if (
            oldSanitizedAction.alertsFilter &&
            isEqual(oldSanitizedAction.alertsFilter[key], value)
          )
            return state;

          const { alertsFilter, ...rest } = oldSanitizedAction;
          const updatedAlertsFilter = { ...alertsFilter, [key]: value };

          const updatedAction = {
            ...rest,
            ...(!isEmpty(updatedAlertsFilter) ? { alertsFilter: updatedAlertsFilter } : {}),
          };
          rule.actions.splice(index, 0, updatedAction);
          return {
            ...state,
            rule: {
              ...rule,
              actions: [...rule.actions],
            },
          };
        }
      }
      case 'setRuleActionProperty': {
        const { key, value, index } = action.payload as RuleActionPayload<keyof RuleUiAction>;
        if (index === undefined || isEqual(rule.actions[index][key], value)) {
          return state;
        } else {
          const oldAction = rule.actions.splice(index, 1)[0];
          const updatedAction = {
            ...oldAction,
            [key]: value,
          };
          rule.actions.splice(index, 0, updatedAction);
          return {
            ...state,
            rule: {
              ...rule,
              actions: [...rule.actions],
            },
          };
        }
      }
      case 'setAlertDelayProperty': {
        const { key, value } = action.payload as Payload<keyof AlertDelay, SavedObjectAttribute>;
        if (rule.alertDelay && isEqual(rule.alertDelay[key], value)) {
          return state;
        } else {
          return {
            ...state,
            rule: {
              ...rule,
              alertDelay: {
                ...rule.alertDelay,
                [key]: value,
              },
            },
          };
        }
      }
    }
  };
