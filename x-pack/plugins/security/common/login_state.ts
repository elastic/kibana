/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LoginLayout } from './licensing';

export interface LoginSelector {
  enabled: boolean;
  providers: Array<{ type: string; name: string; description?: string }>;
}

export interface LoginState {
  layout: LoginLayout;
  allowLogin: boolean;
  showLoginForm: boolean;
  requiresSecureConnection: boolean;
  selector: LoginSelector;
}
