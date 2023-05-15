/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';

export const INTEGRATIONS_URL = '/api/fleet/epm/packages/installed';
export const getIntegrationsUrl = (search = {}) => {
  const querySearch = new URLSearchParams(search).toString();

  return [INTEGRATIONS_URL, querySearch].filter(Boolean).join('/');
};

export const DATA_STREAMS_URL = '/api/fleet/epm/data_streams';
export const getDataStreamsUrl = (search = {}) => {
  const querySearch = new URLSearchParams(search).toString();

  return [DATA_STREAMS_URL, querySearch].filter(Boolean).join('/');
};

export const sortDirectionRT = rt.union([rt.literal('asc'), rt.literal('desc')]);
