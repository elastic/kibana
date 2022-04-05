/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { ConcreteTaskInstance } from '../../../task_manager/server';
import {
  SanitizedAlert,
  RuleTaskState,
  ruleParamsSchema,
  ruleStateSchema,
  RuleTaskParams,
  AlertTypeParams
} from '../../common';
import { RuleTaskInstance } from './types';

export type EphemeralAlertTaskInstance<Params extends AlertTypeParams> = ConcreteTaskInstance<RuleTaskState, RuleTaskParams & { rule: SanitizedAlert<Params>, apiKey: string | null }>;
export type AlertingTaskInstance<Params extends AlertTypeParams> = RuleTaskInstance | EphemeralAlertTaskInstance<Params>;

export function isEphemeralAlertTaskInstance<Params extends AlertTypeParams>(taskInstance: AlertingTaskInstance<AlertTypeParams>): taskInstance is EphemeralAlertTaskInstance<Params> {
  return !!((taskInstance as EphemeralAlertTaskInstance<Params>).params.rule);
}

const enumerateErrorFields = (e: t.Errors) =>
  `${e.map(({ context }) => context.map(({ key }) => key).join('.'))}`;

export function taskInstanceToAlertTaskInstance<Params extends AlertTypeParams>(
  taskInstance: ConcreteTaskInstance,
  alert?: SanitizedAlert<Params>
): AlertingTaskInstance<Params> {
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
