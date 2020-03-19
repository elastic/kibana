/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RegisterManagementAppArgs, I18nStart } from '../types';

export declare const renderApp: (
  elem: HTMLElement | null,
  I18nContext: I18nStart['Context']
) => ReturnType<RegisterManagementAppArgs['mount']>;
