/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { LaunchDarklyClient } from './launch_darkly_client';

function createLaunchDarklyClientMock(): jest.Mocked<LaunchDarklyClient> {
  const launchDarklyClientMock: jest.Mocked<PublicMethodsOf<LaunchDarklyClient>> = {
    updateUserMetadata: jest.fn(),
    getVariation: jest.fn(),
    getAllFlags: jest.fn(),
    reportMetric: jest.fn(),
    stop: jest.fn(),
  };

  return launchDarklyClientMock as jest.Mocked<LaunchDarklyClient>;
}

export const launchDarklyClientMocks = {
  launchDarklyClientMock: createLaunchDarklyClientMock(),
  createLaunchDarklyClient: createLaunchDarklyClientMock,
};
