/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CHROMIUM } from '../browsers/browser_types';

export const validateBrowser = async (browserFactory: any, log: (message: string) => any) => {
  if (browserFactory.type === CHROMIUM) {
    return browserFactory
      .test({
        viewport: {
          width: 800,
          height: 600,
        },
      })
      .then((browser: any) => browser.close())
      .catch((error: Error) =>
        log(`Issues testing chromium launch, you may have troubles generating reports: ` + error)
      );
  }
};
