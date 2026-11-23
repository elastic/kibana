/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core/public';
export {}; // Hack to declare this file as a module so TS allows us to extend the Global Window interface

declare global {
  interface Window {
    __registeredUiSettings__: ReturnType<IUiSettingsClient['getAll']>;
  }
}
