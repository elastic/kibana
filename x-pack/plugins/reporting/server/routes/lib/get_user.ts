/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { SecurityPluginSetup } from '../../../../security/server';

export function getUser(request: KibanaRequest, security?: SecurityPluginSetup) {
  return security?.authc.getCurrentUser(request) ?? false;
}
