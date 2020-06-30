/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import puppeteer from 'puppeteer';
// @ts-ignore lacking typedefs which this module fixes
import puppeteerCore from 'puppeteer-core';

export const puppeteerLaunch: (
  opts?: puppeteer.LaunchOptions
) => Promise<puppeteer.Browser> = puppeteerCore.launch.bind(puppeteerCore);
