/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CamelToSnake, RewriteRequestCase } from './rewrite_request_case';
import { RuleAction } from '../../types';

type ReqRuleAction = Omit<RuleAction, 'actionTypeId' | 'frequency'> & {
  frequency?: {
    [K in keyof NonNullable<RuleAction['frequency']> as CamelToSnake<K>]: NonNullable<
      RuleAction['frequency']
    >[K];
  };
};
export const rewriteActions: (
  actions?: ReqRuleAction[]
) => Array<Omit<RuleAction, 'actionTypeId'>> = (actions) => {
  const rewriteFrequency: RewriteRequestCase<NonNullable<RuleAction['frequency']>> = ({
    notify_when: notifyWhen,
    ...rest
  }) => ({ ...rest, notifyWhen });
  if (!actions) return [];
  return actions.map(
    (action) =>
      ({
        ...action,
        ...(action.frequency ? { frequency: rewriteFrequency(action.frequency) } : {}),
      } as RuleAction)
  );
};
