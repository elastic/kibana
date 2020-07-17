/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { isString, cloneDeepWith } from 'lodash';
import { AlertActionParams, State, Context } from '../types';

interface TransformActionParamsOptions {
  alertId: string;
  alertName: string;
  spaceId: string;
  tags?: string[];
  alertInstanceId: string;
  actionParams: AlertActionParams;
  state: State;
  context: Context;
}

export function transformActionParams({
  alertId,
  alertName,
  spaceId,
  tags,
  alertInstanceId,
  context,
  actionParams,
  state,
}: TransformActionParamsOptions): AlertActionParams {
  const result = cloneDeepWith(actionParams, (value: unknown) => {
    if (!isString(value)) return;

    // when the list of variables we pass in here changes,
    // the UI will need to be updated as well; see:
    // x-pack/plugins/triggers_actions_ui/public/application/lib/action_variables.ts
    const variables = {
      alertId,
      alertName,
      spaceId,
      tags,
      alertInstanceId,
      context,
      state,
    };
    return Mustache.render(value, variables);
  });

  // The return type signature for `cloneDeep()` ends up taking the return
  // type signature for the customizer, but rather than pollute the customizer
  // with casts, seemed better to just do it in one place, here.
  return (result as unknown) as AlertActionParams;
}
