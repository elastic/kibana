/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSetupMock } from 'x-pack/plugins/apm/server/testHelpers/mocks';
import { fetch } from '../fetcher';

describe('CPU chart data fetcher', () => {
  it('should fetch aggregations', async () => {
    const mockSetup = getSetupMock();
    await fetch({ setup: mockSetup, serviceName: 'test-service' });
    expect(mockSetup.client.mock.calls).toMatchSnapshot();
  });
});
