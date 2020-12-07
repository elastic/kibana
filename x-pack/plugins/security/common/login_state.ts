/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LoginLayout } from './licensing';

export interface LoginSelectorProvider {
  type: string;
  name: string;
  usesLoginForm: boolean;
  showInSelector: boolean;
  description?: string;
  hint?: string;
  icon?: string;
}

export interface LoginSelector {
  enabled: boolean;
  providers: LoginSelectorProvider[];
}

export interface LoginState {
  layout: LoginLayout;
  allowLogin: boolean;
  requiresSecureConnection: boolean;
  loginHelp?: string;
  selector: LoginSelector;
}
