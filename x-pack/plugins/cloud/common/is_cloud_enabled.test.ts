/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIsCloudEnabled } from './is_cloud_enabled';

const MOCK_CLOUD_ID_STAGING =
  'staging:dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';
const MOCK_CLOUD_ID_PROD =
  'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';

describe('getIsCloudEnabled', () => {
  it('returns `false` if `id` is not undefined', async () => {
    const cloudId = undefined;
    const isCloudEnabled = getIsCloudEnabled(cloudId);
    expect(isCloudEnabled).toBe(false);
  });

  it('returns `false` if `id` is not a string', async () => {
    const cloudId = 123 as any;
    const isCloudEnabled = getIsCloudEnabled(cloudId);
    expect(isCloudEnabled).toBe(false);
  });

  it('returns `true` if `id` is a string', async () => {
    const isCloudEnabledStaging = getIsCloudEnabled(MOCK_CLOUD_ID_STAGING);
    const isCloudEnabledProd = getIsCloudEnabled(MOCK_CLOUD_ID_PROD);
    expect(isCloudEnabledStaging).toBe(true);
    expect(isCloudEnabledProd).toBe(true);
  });
});
