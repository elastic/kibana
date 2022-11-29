/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import {
  SanitizedRule,
  RuleTaskState,
  ruleParamsSchema,
  ruleStateSchema,
  RuleTaskParams,
  RuleTypeParams,
} from '../../common';

export interface AlertTaskInstance extends ConcreteTaskInstance {
  state: RuleTaskState;
  params: RuleTaskParams;
}

const enumerateErrorFields = (e: t.Errors) =>
  `${e.map(({ context }) => context.map(({ key }) => key).join('.'))}`;

export function taskInstanceToAlertTaskInstance<Params extends RuleTypeParams>(
  taskInstance: ConcreteTaskInstance,
  alert?: SanitizedRule<Params>
): AlertTaskInstance {
  return {
    ...taskInstance,
    params: pipe(
      ruleParamsSchema.decode(taskInstance.params),
      fold((e: t.Errors) => {
        throw new Error(
          `Task "${taskInstance.id}" ${
            alert ? `(underlying Alert "${alert.id}") ` : ''
          }has an invalid param at ${enumerateErrorFields(e)}`
        );
      }, t.identity)
    ),
    state: pipe(
      ruleStateSchema.decode(taskInstance.state),
      fold((e: t.Errors) => {
        throw new Error(
          `Task "${taskInstance.id}" ${
            alert ? `(underlying Alert "${alert.id}") ` : ''
          }has invalid state at ${enumerateErrorFields(e)}`
        );
      }, t.identity)
    ),
  };
}

export function decodeParams(params: ConcreteTaskInstance['params']) {
  return pipe(
    ruleParamsSchema.decode(params),
    fold((e: t.Errors) => {
      throw new Error(`Task has an invalid param at ${enumerateErrorFields(e)}`);
    }, t.identity)
  );
}

export function decodeState(state: SanitizedRule['state']) {
  if (!state) {
    return {};
  }
  return pipe(
    ruleStateSchema.decode(state),
    fold((e: t.Errors) => {
      throw new Error(`Task has invalid state at ${enumerateErrorFields(e)}`);
    }, t.identity)
  );
}
