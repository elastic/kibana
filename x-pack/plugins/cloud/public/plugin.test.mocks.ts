/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customEvents } from '@kbn/custom-events';
import { PublicMethodsOf } from '@kbn/utility-types';

export const customEventsApiMock: jest.Mocked<PublicMethodsOf<typeof customEvents>> = {
  initialize: jest.fn().mockResolvedValue(true),
  setCustomEventContext: jest.fn(),
  setUserContext: jest.fn(),
  reportCustomEvent: jest.fn(),
};

jest.doMock('@kbn/custom-events', () => {
  return { customEvents: customEventsApiMock };
});
