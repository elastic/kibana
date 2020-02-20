/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { ConcreteTaskInstance } from '../../../../plugins/task_manager/server';
import { SanitizedAlert, AlertTaskState, alertParamsSchema, alertStateSchema } from '../../common';

export interface AlertTaskInstance extends ConcreteTaskInstance {
  state: AlertTaskState;
}

const enumerateErrorFields = (e: t.Errors) =>
  `${e.map(({ context }) => context.map(({ key }) => key).join('.'))}`;

export function taskInstanceToAlertTaskInstance(
  taskInstance: ConcreteTaskInstance,
  alert?: SanitizedAlert
): AlertTaskInstance {
  return {
    ...taskInstance,
    params: pipe(
      alertParamsSchema.decode(taskInstance.params),
      fold((e: t.Errors) => {
        throw new Error(
          `Task "${taskInstance.id}" ${
            alert ? `(underlying Alert "${alert.id}") ` : ''
          }has an invalid param at ${enumerateErrorFields(e)}`
        );
      }, t.identity)
    ),
    state: pipe(
      alertStateSchema.decode(taskInstance.state),
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
