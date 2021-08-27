/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import type { ConcreteTaskInstance } from '../../../task_manager/server/task';
import type { AlertTypeParams, SanitizedAlert } from '../../common/alert';
import type { AlertTaskParams, AlertTaskState } from '../../common/alert_task_instance';
import { alertParamsSchema, alertStateSchema } from '../../common/alert_task_instance';

export interface AlertTaskInstance extends ConcreteTaskInstance {
  state: AlertTaskState;
  params: AlertTaskParams;
}

const enumerateErrorFields = (e: t.Errors) =>
  `${e.map(({ context }) => context.map(({ key }) => key).join('.'))}`;

export function taskInstanceToAlertTaskInstance<Params extends AlertTypeParams>(
  taskInstance: ConcreteTaskInstance,
  alert?: SanitizedAlert<Params>
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
