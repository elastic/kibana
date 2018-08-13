/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CHECK_PRIVILEGES_RESULT } from "./check_privileges";

export class AuthorizationMode {
  constructor(actions, checkPrivilegesAtAllResourcesWithRequest, xpackInfoFeature) {
    this._useRbacForRequestWeakMap = new WeakMap();
    this._actions = actions;
    this._checkPrivilegesAtAllResourcesWithRequest = checkPrivilegesAtAllResourcesWithRequest;
    this._xpackInfoFeature = xpackInfoFeature;
  }

  async initialize(request) {
    if (this._useRbacForRequestWeakMap.has(request)) {
      throw new Error('Authorization mode is already intitialized');
    }

    if (!this.isRbacEnabled()) {
      this._useRbacForRequestWeakMap.set(request, false);
      return;
    }

    const checkPrivilegesAtAllResources = this._checkPrivilegesAtAllResourcesWithRequest(request);
    const { result } = await checkPrivilegesAtAllResources([this._actions.login]);
    this._useRbacForRequestWeakMap.set(request, result !== CHECK_PRIVILEGES_RESULT.LEGACY);
  }

  useRbacForRequest(request) {
    return this._useRbacForRequestWeakMap.get(request);
  }

  isRbacEnabled() {
    return this._xpackInfoFeature.getLicenseCheckResults().allowRbac;
  }
}
