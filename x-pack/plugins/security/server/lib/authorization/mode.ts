/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XPackFeature } from 'x-pack/plugins/xpack_main/server/lib/xpack_info';

export interface AuthorizationMode {
  useRbac(): boolean;
}

export function authorizationModeFactory(xpackInfoFeature: XPackFeature) {
  return {
    useRbac() {
      return xpackInfoFeature.getLicenseCheckResults().allowRbac;
    },
  };
}
