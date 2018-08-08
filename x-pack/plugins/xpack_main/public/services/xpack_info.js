/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import chrome from 'ui/chrome';
import { XPackInfoSignatureProvider } from 'plugins/xpack_main/services/xpack_info_signature';
import { convertKeysToCamelCaseDeep } from '../../../../server/lib/key_case_converter';

const XPACK_INFO_KEY = 'xpackMain.info';

export function XPackInfoProvider($window, $injector, Private) {
  const xpackInfoSignature = Private(XPackInfoSignatureProvider);

  class XPackInfo {
    constructor(initialInfo = {}) {
      this.inProgressRefreshPromise = null;
      this.setAll(initialInfo);
    }

    get = (path, defaultValue = undefined) => {
      const xpackInfoValuesJson = $window.sessionStorage.getItem(XPACK_INFO_KEY);
      const xpackInfoValues = xpackInfoValuesJson ? JSON.parse(xpackInfoValuesJson) : {};
      return get(xpackInfoValues, path, defaultValue);
    };

    setAll = (updatedXPackInfo) => {
      $window.sessionStorage.setItem(XPACK_INFO_KEY, JSON.stringify(updatedXPackInfo));
    };

    clear = () => {
      $window.sessionStorage.removeItem(XPACK_INFO_KEY);
    };

    refresh = () => {
      if (this.inProgressRefreshPromise) {
        return this.inProgressRefreshPromise;
      }

      // store the promise in a shared location so that calls to
      // refresh() before this is complete will get the same promise
      const $http = $injector.get('$http');
      this.inProgressRefreshPromise = (
        $http.get(chrome.addBasePath('/api/xpack/v1/info'))
          .catch((err) => {
          // if we are unable to fetch the updated info, we should
          // prevent reusing stale info
            this.clear();
            xpackInfoSignature.clear();
            throw err;
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

  return new XPackInfo(chrome.getInjected('xpackInitialInfo'));
}
