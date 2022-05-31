/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

async function loginAs({
  kibanaUrl,
  username,
  password,
}: {
  kibanaUrl: string;
  username: string;
  password: string;
}) {
  await axios.post(
    `${kibanaUrl}/internal/security/login`,
    {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: `${kibanaUrl}/login`,
      params: { username, password },
    },
    {
      headers: {
        'kbn-xsrf': 'e2e_test',
      },
    }
  );
}

export async function loginAsReadOnlyUser(kibanaUrl: string) {
  await loginAs({ kibanaUrl, username: 'apm_read_user', password: 'changeme' });
}

export async function loginAsPowerUser(kibanaUrl: string) {
  await loginAs({
    kibanaUrl,
    username: 'apm_power_user',
    password: 'changeme',
  });
}
