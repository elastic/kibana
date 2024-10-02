/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Availability } from '../use_availability';

export const useAvailability = jest.fn((): Availability => {
  return { hasLicense: true, renderUpselling: undefined };
});

export const useIsAvailable = jest.fn((): boolean => true);
