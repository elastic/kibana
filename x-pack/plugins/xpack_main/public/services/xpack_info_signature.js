/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const XPACK_INFO_SIG_KEY = 'xpackMain.infoSignature';

class XPackInfoSignature {
  get() {
    return window.sessionStorage.getItem(XPACK_INFO_SIG_KEY);
  }

  set(updatedXPackInfoSignature) {
    window.sessionStorage.setItem(XPACK_INFO_SIG_KEY, updatedXPackInfoSignature);
  }

  clear() {
    window.sessionStorage.removeItem(XPACK_INFO_SIG_KEY);
  }
}

export const xpackInfoSignature = new XPackInfoSignature();
