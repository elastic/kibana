/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { SecurityPluginSetup } from '../../../../security/server';

export function getUserFactory(security?: SecurityPluginSetup) {
  return (request: KibanaRequest) => {
    return security?.authc.getCurrentUser(request) ?? false;
  };
}
