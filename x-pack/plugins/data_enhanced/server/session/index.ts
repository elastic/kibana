/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { SessionService } from './session_service';
export { backgroundSession, BACKGROUND_SESSION_TYPE } from './saved_object';
export { registerBackgroundSessionGetRoute, registerBackgroundSessionSaveRoute } from './routes';
