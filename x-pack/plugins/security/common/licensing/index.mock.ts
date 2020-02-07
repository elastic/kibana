/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { SecurityLicense } from '.';

export const licenseMock = {
  create: (): jest.Mocked<SecurityLicense> => ({
    isEnabled: jest.fn().mockReturnValue(true),
    getFeatures: jest.fn(),
    features$: of(),
  }),
};
