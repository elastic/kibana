/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licensingMock } from '../../../../licensing/public/mocks';

export const mockLicenseContext = {
  license: licensingMock.createLicense(),
};
