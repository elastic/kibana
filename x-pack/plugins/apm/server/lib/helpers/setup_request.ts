/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import moment from 'moment';
import { getESClient } from './es_client';

function decodeUiFiltersES(esQuery?: string) {
  return esQuery ? JSON.parse(decodeURIComponent(esQuery)) : null;
}

export interface APMRequestQuery {
  _debug: string;
  start: string;
  end: string;
  uiFiltersES?: string;
}

export type Setup = ReturnType<typeof setupRequest>;
export function setupRequest(req: Legacy.Request) {
  const query = (req.query as unknown) as APMRequestQuery;
  const config = req.server.config();

  return {
    start: moment.utc(query.start).valueOf(),
    end: moment.utc(query.end).valueOf(),
    uiFiltersES: decodeUiFiltersES(query.uiFiltersES) || [],
    client: getESClient(req),
    config
  };
}
