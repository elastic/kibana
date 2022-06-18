/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/test';
import type { RunContext } from '@kbn/dev-cli-runner';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { ENDPOINTS_ACTION_LIST_ROUTE } from '../../../common/endpoint/constants';
import { ActionListApiResponse } from '../../../common/endpoint/types';
import { EndpointActionListRequestQuery } from '../../../common/endpoint/schema/actions';

export const sleep = (ms: number = 1000) => new Promise((r) => setTimeout(r, ms));

export interface RuntimeServices {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
}

export const createRuntimeServices = ({
  log,
  flags: { kibana, elastic, username, password },
}: RunContext): RuntimeServices => {
  const kbnUrl = new URL(kibana as string);
  kbnUrl.username = username as string;
  kbnUrl.password = password as string;

  const esUrl = new URL(elastic as string);
  esUrl.username = username as string;
  esUrl.password = password as string;

  log.verbose(`Kibana URL: ${kbnUrl.href}`, `Elasticsearch URL: ${esUrl.href}`);

  const kbnClient = new KbnClient({ log, url: kbnUrl.href });
  const esClient = new Client({ node: esUrl.href });

  return {
    kbnClient,
    esClient,
    log,
  };
};

export const fetchEndpointActionList = async (
  kbn: KbnClient,
  options: EndpointActionListRequestQuery = {}
): Promise<ActionListApiResponse> => {
  return (
    await kbn.request<ActionListApiResponse>({
      method: 'GET',
      path: ENDPOINTS_ACTION_LIST_ROUTE,
      query: options,
    })
  ).data;
};

export const sendFleetActionResponse = async () => {};

export const sendEndpointActionResponse = async () => {};
