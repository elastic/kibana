/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorParams } from '../../../common/types';

/**
 * Add `forceNow` to {@link LocatorParams['params']} to enable clients to set the time appropriately when
 * reporting navigates to the page in Chromium.
 */
export const setForceNow =
  (forceNow: string) =>
  (locator: LocatorParams): LocatorParams => {
    return {
      ...locator,
      params: {
        ...locator.params,
        forceNow,
      },
    };
  };
