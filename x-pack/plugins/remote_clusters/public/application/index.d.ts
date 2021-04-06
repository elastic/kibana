/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScopedHistory } from 'kibana/public';
import { RegisterManagementAppArgs, I18nStart } from '../types';

export declare const renderApp: (
  elem: HTMLElement | null,
  I18nContext: I18nStart['Context'],
  appDependencies: {
    isCloudEnabled?: boolean;
  },
  history: ScopedHistory
) => ReturnType<RegisterManagementAppArgs['mount']>;
