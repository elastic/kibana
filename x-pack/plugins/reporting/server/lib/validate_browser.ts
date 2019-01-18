/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as puppeteer from 'puppeteer-core';
import { CHROMIUM } from '../browsers/browser_types';

export const validateBrowser = async (browserFactory: any, log: (message: string) => any) => {
  if (browserFactory.type === CHROMIUM) {
    return browserFactory
      .test(
        {
          viewport: {
            width: 800,
            height: 600,
          },
        },
        log
      )
      .then((browser: puppeteer.Browser | null) => {
        if (browser && browser.close) {
          browser.close();
        }
      });
  }
};
