/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { isEmpty, mapValues, omitBy } from 'lodash';
import { Integration } from '../types';
import { FindDatasetsRequestQuery } from './find_datasets';
import { FindIntegrationsRequestQuery } from './find_integrations';

/**
 * Constants
 */
export const DATASETS_URL = '/api/fleet/epm/datasets';
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

/**
 * Utils
 */
function stringifyByProp(
  obj: FindIntegrationsRequestQuery | FindDatasetsRequestQuery,
  props: string[]
) {
  return mapValues(obj, (val, key) => (props.includes(key) ? JSON.stringify(val) : val));
}

/**
 * Format the integrations and data streams search request into the required API format
 */
export const formatSearch = (search: FindIntegrationsRequestQuery | FindDatasetsRequestQuery) => {
  return stringifyByProp(omitBy(search, isEmpty), ['searchAfter']);
};
