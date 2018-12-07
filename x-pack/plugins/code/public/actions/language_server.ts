/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const loadLanguageServers = createAction('LOAD LANGUAGE SERVERS');
export const loadLanguageServersSuccess = createAction<any>('LOAD LANGUAGE SERVERS SUCCESS');
export const loadLanguageServersFailed = createAction<Error>('LOAD LANGUAGE SERVERS FAILED');

export const installLanguageServer = createAction('INSTALL LANGUAGE SERVERS');
export const installLanguageServerSuccess = createAction<any>('INSTALL LANGUAGE SERVERS SUCCESS');
export const installLanguageServerFailed = createAction<Error>('INSTALL LANGUAGE SERVERS FAILED');
