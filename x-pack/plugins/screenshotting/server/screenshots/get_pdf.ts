/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import type { Screenshot } from './types';

export async function getPdf(
  browser: HeadlessChromiumDriver,
  logger: Logger
): Promise<Screenshot[]> {
  logger.info('printing PDF');

  return [
    {
      data: await browser.printA4Pdf(),
      title: null,
      description: null,
    },
  ];
}
