/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import { Component } from 'react';

export const tick = (ms = 0) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export const takeMountedSnapshot = (mountedComponent: ReactWrapper<{}, {}, Component>) => {
  const html = mountedComponent.html();
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
};

export const waitFor = (fn: () => boolean, stepMs = 100, failAfterMs = 1000) => {
  return new Promise((resolve, reject) => {
    let waitForTimeout: NodeJS.Timeout;

    const tryCondition = () => {
      if (fn()) {
        clearTimeout(failTimeout);
        resolve();
      } else {
        waitForTimeout = setTimeout(tryCondition, stepMs);
      }
    };

    const failTimeout = setTimeout(() => {
      clearTimeout(waitForTimeout);
      reject('wait for condition was never met');
    }, failAfterMs);

    tryCondition();
  });
};
