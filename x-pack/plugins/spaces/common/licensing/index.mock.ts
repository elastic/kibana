/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesLicense } from '.';

export const licenseMock = {
  create: (): jest.Mocked<SpacesLicense> => ({
    isEnabled: jest.fn().mockReturnValue(true),
  }),
};
