/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';

import { exceptionListAgnosticType, exceptionListType } from './exception_list';

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']): void => {
  savedObjects.registerType(exceptionListAgnosticType);
  savedObjects.registerType(exceptionListType);
};
