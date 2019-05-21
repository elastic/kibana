/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const loadLanguageServers = createAction('LOAD LANGUAGE SERVERS');
export const loadLanguageServersSuccess = createAction<any>('LOAD LANGUAGE SERVERS SUCCESS');
export const loadLanguageServersFailed = createAction<Error>('LOAD LANGUAGE SERVERS FAILED');

export const requestInstallLanguageServer = createAction('REQUEST INSTALL LANGUAGE SERVERS');
export const requestInstallLanguageServerSuccess = createAction<any>(
  'REQUEST INSTALL LANGUAGE SERVERS SUCCESS'
);
export const requestInstallLanguageServerFailed = createAction<Error>(
  'REQUEST INSTALL LANGUAGE SERVERS FAILED'
);

export const installLanguageServerSuccess = createAction<any>('INSTALL LANGUAGE SERVERS SUCCESS');

export const languageServerInitializing = createAction('LANGUAGE SERVER INITIALIZING');
