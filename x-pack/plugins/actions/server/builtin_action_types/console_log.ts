/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, ExecutorOptions } from '../action_type_service';

export const actionType: ActionType = {
  id: 'kibana.console-log',
  name: 'console-log',
  executor,
};

async function executor(options: ExecutorOptions): Promise<any> {
  const message = options.params.message || 'no message supplied';

  // eslint-disable-next-line no-console
  console.log(message);
}
