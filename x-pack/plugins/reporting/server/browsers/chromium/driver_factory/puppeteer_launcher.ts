/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import puppeteer, { type PuppeteerLaunchOptions } from 'puppeteer';

import { CaptureConfig } from '../../../../server/types';

type LaunchOptions = Pick<PuppeteerLaunchOptions, 'userDataDir' | 'protocolTimeout'> & {
  browserConfig: CaptureConfig['browser']['chromium'];
  binaryPath: PuppeteerLaunchOptions['executablePath'];
  chromiumArgs: PuppeteerLaunchOptions['args'];
  viewport: PuppeteerLaunchOptions['defaultViewport'];
  browserTimezone?: string;
};

export async function launch({
  browserConfig,
  userDataDir,
  binaryPath,
  chromiumArgs,
  viewport,
  browserTimezone,
  protocolTimeout,
}: LaunchOptions) {
  return await puppeteer.launch({
    pipe: !browserConfig.inspect,
    userDataDir,
    executablePath: binaryPath,
    acceptInsecureCerts: true,
    handleSIGHUP: false,
    args: chromiumArgs,
    defaultViewport: viewport,
    env: {
      TZ: browserTimezone,
    },
    headless: true,
    protocolTimeout,
  });
}
