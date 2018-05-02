/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// service for interacting with the server

import chrome from 'ui/chrome';
import 'isomorphic-fetch';

import { addSystemApiHeader } from 'ui/system_api';

const promise = window.Promise;

export function initPromise(replacePromise) {
  return function ($q) {
    window.Promise = replacePromise ? $q : promise;
    return Promise.resolve();
  };
}

export function http(options) {
  return new Promise((resolve, reject) => {
    if(options && options.url) {
      let url = '';
      url = url + (options.url || '');
      const headers = addSystemApiHeader({
        'Content-Type': 'application/json',
        'kbn-version': chrome.getXsrfToken(),
        ...options.headers
      });

      const allHeaders = (options.headers === undefined) ? headers : { ...options.headers, ...headers };
      const body = (options.data === undefined) ? null : JSON.stringify(options.data);

      fetch(url, {
        method: (options.method || 'GET'),
        headers: (allHeaders),
        credentials: 'same-origin',
        body,
      })
        .then((resp) => {
          if (resp.ok === true) {
            resolve(resp.json());
          } else {
            reject(resp);
          }
        })
        .catch((resp) => {
          reject(resp);
        });
    } else {
      reject();
    }
  });
}
