/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';

export const testUserDefinedRule = ({
  http,
  isUrl,
  codeOrUrl,
  customContextVariables,
}: {
  http: HttpSetup;
  isUrl: boolean;
  codeOrUrl: string;
  customContextVariables?: Array<{
    name: string;
    description: string;
  }>;
}) => {
  return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/_test`, {
    body: JSON.stringify({
      params: {
        isUrl,
        codeOrUrl,
        ...(customContextVariables ? { customContextVariables } : {}),
      },
    }),
  });
};
