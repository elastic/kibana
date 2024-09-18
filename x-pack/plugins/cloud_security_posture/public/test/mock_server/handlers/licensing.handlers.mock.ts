/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';

export const MOCK_SERVER_LICENSING_INFO_URL = `/api/licensing/info`;

export const defaultApiLicensingInfo = http.get(MOCK_SERVER_LICENSING_INFO_URL, () => {
  const date = new Date();
  const expiryDateInMillis = date.setDate(date.getDate() + 30);

  return HttpResponse.json({
    license: {
      uid: '000000-0000-0000-0000-000000000',
      type: 'trial',
      mode: 'trial',
      expiryDateInMillis,
      status: 'active',
    },
    features: {
      security: {
        isAvailable: true,
        isEnabled: true,
      },
    },
    signature: '0000000000000000000000000000000000000000000000000000000',
  });
});
