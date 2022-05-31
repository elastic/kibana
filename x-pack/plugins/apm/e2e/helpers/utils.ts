/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@elastic/synthetics';

export const assertText = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  await page.waitForSelector(`text=${text}`);
  expect(await page.$(`text=${text}`)).toBeTruthy();
};
