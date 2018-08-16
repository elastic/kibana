/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import chrome from 'ui/chrome';
import { kfetch } from 'ui/kfetch';
import { xpackInfoSignature } from './xpack_info_signature';
import { convertKeysToCamelCaseDeep } from '../../../../server/lib/key_case_converter';

export const XPACK_INFO_KEY = 'xpackMain.info';

class XPackInfo {
  constructor(initialInfo = {}) {
    this.inProgressRefreshPromise = null;
    this.setAll(initialInfo);
  }

  get = (path, defaultValue = undefined) => {
    const xpackInfoValuesJson = window.sessionStorage.getItem(XPACK_INFO_KEY);
    const xpackInfoValues = xpackInfoValuesJson ? JSON.parse(xpackInfoValuesJson) : {};
    return get(xpackInfoValues, path, defaultValue);
  };

  setAll = (updatedXPackInfo) => {
    window.sessionStorage.setItem(XPACK_INFO_KEY, JSON.stringify(updatedXPackInfo));
  };

  clear = () => {
    window.sessionStorage.removeItem(XPACK_INFO_KEY);
  };

  refresh = () => {
    if (this.inProgressRefreshPromise) {
      return this.inProgressRefreshPromise;
    }

    // store the promise in a shared location so that calls to
    // refresh() before this is complete will get the same promise
    this.inProgressRefreshPromise = (
      kfetch({ method: 'GET', pathname: '/api/xpack/v1/info' })
        .catch((fetchError) => {
        // if we are unable to fetch the updated info, we should
        // prevent reusing stale info
          this.clear();
          xpackInfoSignature.clear();
          throw fetchError;
        })
        .then((xpackInfoResponse) => {
          this.setAll(convertKeysToCamelCaseDeep(xpackInfoResponse.data));
          xpackInfoSignature.set(xpackInfoResponse.headers('kbn-xpack-sig'));
        })
        .finally(() => {
          this.inProgressRefreshPromise = null;
        })
    );
    return this.inProgressRefreshPromise;
  };

  getLicense = () => {
    return this.get('license', {
      isActive: false,
      type: undefined,
      expiryDateInMillis: undefined,
    });
  };
}

export const xpackInfo = new XPackInfo(chrome.getInjected('xpackInitialInfo'));

// Angular friendly wrapper around xpackInfo. Use xpackInfo unless you still need angular Promises
export function XPackInfoProvider(Promise) {
  return {
    get: (...args) => {
      return xpackInfo.get(...args);
    },
    setAll: (...args) => {
      return xpackInfo.setAll(...args);
    },
    clear: (...args) => {
      return xpackInfo.clear(...args);
    },
    refresh: (...args) => {
      return Promise.resolve(xpackInfo.refresh(...args));
    },
    getLicense: (...args) => {
      return xpackInfo.getLicense(...args);
    },
  };
}
