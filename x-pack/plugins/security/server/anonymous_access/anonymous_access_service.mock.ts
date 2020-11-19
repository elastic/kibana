/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type {
  AnonymousAccessServiceSetup,
  AnonymousAccessServiceStart,
} from './anonymous_access_service';

export const anonymousAccessServiceMock = {
  createSetup: (): jest.Mocked<AnonymousAccessServiceSetup> => ({
    isAnonymousAccessEnabled: false,
  }),
  createStart: (): jest.Mocked<AnonymousAccessServiceStart> => ({
    isAnonymousAccessEnabled: false,
    accessURLParameters: null,
    isSavedObjectTypeAccessibleAnonymously: jest.fn(),
  }),
};
