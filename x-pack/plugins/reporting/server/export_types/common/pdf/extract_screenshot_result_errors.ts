/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce } from 'fp-ts/lib/Array';
import type { ScreenshotResult } from '../../../../../screenshotting/server';

type ScreenshotObservableResult = ScreenshotResult['results'][0];

export const extractScreenshotResultErrors = reduce<ScreenshotObservableResult, string[]>(
  [],
  (found, current) => {
    if (current.error) {
      found.push(current.error.message);
    }
    if (current.renderErrors) {
      found.push(...current.renderErrors);
    }
    return found;
  }
);
