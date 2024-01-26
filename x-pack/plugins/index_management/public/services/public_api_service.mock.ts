/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicApiServiceSetup } from './public_api_service';

export type PublicApiServiceSetupMock = jest.Mocked<PublicApiServiceSetup>;

const createServiceMock = (): PublicApiServiceSetupMock => ({
  getAllEnrichPolicies: jest.fn(),
});

export const publicApiServiceMock = {
  createSetupContract: createServiceMock,
};
