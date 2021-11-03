/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromiseType } from 'utility-types';
import { UMElasticsearchQueryFn } from '../adapters';
import { CertResult, GetCertsParams, Ping } from '../../../common/runtime_types';
import {
  getCertsRequestBody,
  processCertsResult,
} from '../../../common/requests/get_certs_request_body';
import { UptimeESClient } from '../lib';

export const getCerts: UMElasticsearchQueryFn<GetCertsParams, CertResult> = async (
  requestParams
) => {
  const result = await getCertsResults(requestParams);

  return processCertsResult(result);
};

export type CertificatesResults = PromiseType<ReturnType<typeof getCertsResults>>;

const getCertsResults = async (
  requestParams: GetCertsParams & { uptimeEsClient: UptimeESClient }
) => {
  const { uptimeEsClient } = requestParams;

  const searchBody = getCertsRequestBody(requestParams);

  const request = { body: searchBody };

  const { body: result } = await uptimeEsClient.search<Ping, typeof request>({
    body: searchBody,
  });

  return result;
};
