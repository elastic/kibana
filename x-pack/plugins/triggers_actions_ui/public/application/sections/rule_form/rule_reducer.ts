/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omitBy } from 'lodash';
import { Reducer } from 'react';
import {
  RuleActionParam,
  IntervalSchedule,
  SanitizedAlertsFilter,
  RuleDefaultAction,
  RuleSystemAction,
  RuleActionFrequency,
} from '@kbn/alerting-plugin/common';
import { isEmpty } from 'lodash/fp';
import { Rule, RuleAction } from '../../../types';
import { DEFAULT_FREQUENCY } from '../../../common/constants';
import { isSystemAction } from '../../lib/is_system_action';

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

export interface RuleActionPayload<
  Key extends keyof RuleDefaultAction | keyof RuleSystemAction =
    | keyof RuleDefaultAction
    | keyof RuleSystemAction
> {
  key: Key;
  value:
    | (Key extends keyof RuleDefaultAction
        ? RuleDefaultAction[keyof RuleDefaultAction]
        : RuleSystemAction[keyof RuleSystemAction])
    | null;
  index?: number;
}

export interface RuleActionFrequencyPayload {
  key: keyof RuleActionFrequency;
  value: RuleActionFrequency[keyof RuleActionFrequency] | null;
  index?: number;
}

export interface RuleActionAlertsFilterPayload {
  key: keyof SanitizedAlertsFilter;
  value: SanitizedAlertsFilter[keyof SanitizedAlertsFilter] | null;
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
      payload: RuleActionPayload;
    }
  | {
      command: CommandType<'setRuleActionFrequency'>;
      payload: RuleActionFrequencyPayload;
    }
  | {
      command: CommandType<'setRuleActionAlertsFilter'>;
      payload: RuleActionAlertsFilterPayload;
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
      const { key, value, index } = action.payload as Payload<string, RuleActionParam>;

      if (
        index === undefined ||
        rule.actions[index] == null ||
        (!!rule.actions[index].params[key] && isEqual(rule.actions[index].params[key], value))
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
      const { key, value, index } = action.payload as RuleActionFrequencyPayload;
      const ruleAction = index === undefined ? undefined : rule.actions[index];

      if (
        index === undefined ||
        ruleAction == null ||
        isSystemAction(ruleAction) ||
        (!!ruleAction.frequency?.[key] && isEqual(ruleAction.frequency[key], value))
      ) {
        return state;
      } else {
        const oldAction = rule.actions.splice(index, 1)[0];

        if (isSystemAction(oldAction)) {
          return state;
        }

        const updatedAction = {
          ...oldAction,
          frequency: {
            ...(oldAction.frequency ?? DEFAULT_FREQUENCY),
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
      const { key, value, index } = action.payload as RuleActionAlertsFilterPayload;
      const ruleAction = index === undefined ? undefined : rule.actions[index];

      if (
        index === undefined ||
        ruleAction == null ||
        isSystemAction(ruleAction) ||
        (!!ruleAction.alertsFilter?.[key] && isEqual(ruleAction.alertsFilter?.[key], value))
      ) {
        return state;
      } else {
        const oldAction = rule.actions.splice(index, 1)[0];

        if (isSystemAction(oldAction)) {
          return state;
        }

        const { alertsFilter, ...rest } = oldAction;
        const updatedAlertsFilter = { ...alertsFilter, [key]: value };
        /**
         * If a value is null it means that we need to delete
         * it from the object.
         */
        const updatedAlertsFilterWithoutNullValues = omitBy(
          updatedAlertsFilter,
          (filter) => filter == null
        );

        const updatedAction = {
          ...rest,
          ...(!isEmpty(updatedAlertsFilterWithoutNullValues)
            ? { alertsFilter: updatedAlertsFilterWithoutNullValues }
            : {}),
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
      const { key, value, index } = action.payload as RuleActionPayload;
      const ruleAction = index === undefined ? undefined : rule.actions[index];
      const oldValue = ruleAction?.[key as keyof RuleAction];

      if (index === undefined || ruleAction == null || isEqual(oldValue, value)) {
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
