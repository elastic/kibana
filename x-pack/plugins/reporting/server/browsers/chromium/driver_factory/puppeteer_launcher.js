/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import puppeteer from '../../../../../../../node_modules/puppeteer/lib/cjs/puppeteer/puppeteer';

export async function launch(browserConfig, userDataDir, binaryPath, chromiumArgs, viewport, browserTimezone) {
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
  })
}
