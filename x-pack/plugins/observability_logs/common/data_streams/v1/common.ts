/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { isEmpty, mapValues, omitBy } from 'lodash';
import { Integration } from '../types';
import { FindDataStreamsRequestQuery } from './find_data_streams';
import { FindIntegrationsRequestQuery } from './find_integrations';

/**
 * Constants
 */
export const DATA_STREAMS_URL = '/api/fleet/epm/data_streams';
export const INTEGRATIONS_URL = '/api/fleet/epm/packages/installed';

/**
 * Common types
 */
export const sortOrderRT = rt.union([rt.literal('asc'), rt.literal('desc')]);
export type SortOrder = rt.TypeOf<typeof sortOrderRT>;
export type IntegrationId = `integration-${string}-${string}`;

/**
 * Getters
 */

export const getIntegrationId = (integration: Integration): IntegrationId =>
  `integration-${integration.name}-${integration.version}`;

export const getDataStreamsUrl = (search = {}) => {
  const cleanSearch = omitBy(search, isEmpty);
  const querySearch = new URLSearchParams(cleanSearch).toString();

  return [DATA_STREAMS_URL, querySearch].filter(Boolean).join('?');
};

export const getIntegrationsUrl = (search = {}) => {
  const cleanSearch = stringifyByProp(omitBy(search, isEmpty), ['searchAfter']);
  const querySearch = new URLSearchParams(cleanSearch).toString();

  return [INTEGRATIONS_URL, querySearch].filter(Boolean).join('?');
};

/**
 * Utils
 */
function stringifyByProp(
  obj: FindIntegrationsRequestQuery | FindDataStreamsRequestQuery,
  props: string[]
) {
  return mapValues(obj, (val, key) => (props.includes(key) ? JSON.stringify(val) : val));
}
