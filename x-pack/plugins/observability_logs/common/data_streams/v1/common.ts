/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { isUndefined, mapValues, omitBy } from 'lodash';
import { FindDataStreamsRequestQuery } from './find_data_streams';
import { FindIntegrationsRequestQuery } from './find_integrations';

export const INTEGRATIONS_URL = '/api/fleet/epm/packages/installed';
export const getIntegrationsUrl = (search = {}) => {
  const cleanSearch = stringifyByProp(omitBy(search, isUndefined), ['searchAfter']);
  const querySearch = new URLSearchParams(cleanSearch).toString();

  return [INTEGRATIONS_URL, querySearch].filter(Boolean).join('?');
};

export const DATA_STREAMS_URL = '/api/fleet/epm/data_streams';
export const getDataStreamsUrl = (search = {}) => {
  const cleanSearch = stringifyByProp(omitBy(search, isUndefined), ['searchAfter']);
  const querySearch = new URLSearchParams(cleanSearch).toString();

  return [DATA_STREAMS_URL, querySearch].filter(Boolean).join('?');
};

export const sortOrderRT = rt.union([rt.literal('asc'), rt.literal('desc')]);

/**
 * Utils
 */
function stringifyByProp(
  obj: FindIntegrationsRequestQuery | FindDataStreamsRequestQuery,
  props: string[]
) {
  return mapValues(obj, (val, key) => (props.includes(key) ? JSON.stringify(val) : val));
}
