/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import puppeteer from 'puppeteer';

/**
 * This function exists as a JS file in order to prevent the v4.1.3 TypeScript compiler from interpreting types
 * in the Puppeteer node module.
 */

export async function launch(
  browserConfig,
  userDataDir,
  binaryPath,
  chromiumArgs,
  viewport,
  browserTimezone
) {
  return await puppeteer.launch({
    pipe: !browserConfig.inspect,
    userDataDir: userDataDir,
    executablePath: binaryPath,
    ignoreHTTPSErrors: true,
    handleSIGHUP: false,
    args: chromiumArgs,
    defaultViewport: viewport,
    env: {
      TZ: browserTimezone,
    },
  });
}
