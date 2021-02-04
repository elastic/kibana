/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymousAccessServiceStart } from './anonymous_access_service';

import { capabilitiesServiceMock } from '../../../../../src/core/server/mocks';

export const anonymousAccessServiceMock = {
  createStart: (): jest.Mocked<AnonymousAccessServiceStart> => ({
    isAnonymousAccessEnabled: false,
    accessURLParameters: null,
    getCapabilities: jest.fn().mockReturnValue(capabilitiesServiceMock.createCapabilities()),
  }),
};
