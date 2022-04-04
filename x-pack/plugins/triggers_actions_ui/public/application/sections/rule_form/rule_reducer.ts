/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttribute } from 'kibana/public';
import { isEqual } from 'lodash';
import { Reducer } from 'react';
import { RuleActionParam, IntervalSchedule } from '../../../../../alerting/common';
import { Rule, RuleAction } from '../../../types';

export type InitialRule = Partial<Rule> &
  Pick<Rule, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags' | 'notifyWhen'>;

interface CommandType<
  T extends
    | 'setRule'
    | 'setProperty'
    | 'setScheduleProperty'
    | 'setRuleParams'
    | 'setRuleActionParams'
    | 'setRuleActionProperty'
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

interface RuleActionPayload<Key extends keyof RuleAction> {
  key: Key;
  value: RuleAction[Key] | null;
  index?: number;
}

interface RuleSchedulePayload<Key extends keyof IntervalSchedule> {
  key: Key;
  value: IntervalSchedule[Key];
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
      payload: RuleActionPayload<keyof RuleAction>;
    };

export type InitialRuleReducer = Reducer<{ rule: InitialRule }, RuleReducerAction>;
export type ConcreteRuleReducer = Reducer<{ rule: Rule }, RuleReducerAction>;

export const ruleReducer = <RulePhase extends InitialRule | Rule>(
  state: { rule: RulePhase },
  action: RuleReducerAction
) => {
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
        keyof RuleAction,
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
    case 'setRuleActionProperty': {
      const { key, value, index } = action.payload as RuleActionPayload<keyof RuleAction>;
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
  }
};
