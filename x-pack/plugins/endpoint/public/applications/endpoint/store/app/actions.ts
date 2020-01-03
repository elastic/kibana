/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';

interface AppWillMount {
  readonly type: 'appWillMount';
  payload: {
    coreStartServices: CoreStart;
    appBasePath: string;
  };
}

/**
 * Endpoint App has been un-mounted from DOM. Use this opportunity to remove any
 * global event listeners, notify server-side services or other type of cleanup
 */
interface AppDidUnmount {
  readonly type: 'appDidUnmount';
}

export type AppAction = AppWillMount | AppDidUnmount;

export type AppDispatch = (action: AppAction) => AppAction;
