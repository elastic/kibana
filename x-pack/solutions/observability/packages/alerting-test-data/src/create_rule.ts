/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HEADERS, PASSWORD, USERNAME } from './constants';
import { getKibanaUrl } from './get_kibana_url';

export const createRule = async (ruleParams: any) => {
  const RULE_CREATION_API = `${await getKibanaUrl()}/api/alerting/rule`;
  const basicAuth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

  const response = await fetch(RULE_CREATION_API, {
    method: 'POST',
    body: JSON.stringify(ruleParams),
    headers: {
      'content-type': 'application/json',
      ...HEADERS,
      Authorization: `Basic ${basicAuth}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to create rule: ${response.status} ${errorText}`);
  }

  return {
    status: response.status,
    data: await response.json(),
  };
};
