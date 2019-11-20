/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import { AppMountContext } from 'kibana/public';
import { routingSaga } from './common';
import { alertListSaga } from './alert_list';
import { alertDetailsSaga } from './alert_details';
import { endpointsListSaga } from './endpoints_list';
import { homeSaga } from './home';

// TODO: Type this properly
// eslint-disable-next-line import/no-default-export
export default function(context: AppMountContext, history: History) {
  return async function(...args: any[]) {
    await Promise.all([
      routingSaga(...args),
      alertListSaga(...[...args, context, history]),
      alertDetailsSaga(...[...args, context, history]),
      endpointsListSaga(...[...args, context, history]),
    ]);
  };
}
