/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request } from 'hapi';
import { get } from 'lodash';

import { CallClusterWithRequest } from 'src/legacy/core_plugins/elasticsearch';
import { MappingProperties } from './reindexing/types';

/**
 * Returns whether or not this is a metricbeat index that needs the index.query.default_field
 * index setting.
 *
 * @param callWithRequest
 * @param request
 * @param indexName
 */
export const isMetricbeatIndex = async (
  callWithRequest: CallClusterWithRequest,
  request: Request,
  indexName: string
) => {
  if (!indexName.startsWith('metricbeat-')) {
    return false;
  }

  const settings = await callWithRequest(request, 'indices.getSettings', {
    index: indexName,
  });

  return get(settings, `${indexName}.settings.index.query.default_field`) === undefined;
};

/**
 * Adds the index.query.default_field setting, generated from the index's mapping.
 *
 * @param callWithRequest
 * @param request
 * @param indexName
 */
export const fixMetricbeatIndex = async (
  callWithRequest: CallClusterWithRequest,
  request: Request,
  indexName: string
) => {
  if (!(await isMetricbeatIndex(callWithRequest, request, indexName))) {
    throw Boom.badRequest(`Index must be a 6.x index created by Metricbeat`);
  }

  // TODO: handle typed-API calls in 6.7
  const mappingResp = await callWithRequest(request, 'indices.getMapping', {
    index: indexName,
    include_type_name: true,
  });
  const typeName = Object.getOwnPropertyNames(mappingResp[indexName].mappings)[0];
  const mapping = mappingResp[indexName].mappings[typeName].properties as MappingProperties;

  const defaultFieldList = getDefaultFieldList(mapping);
  // This wildcard field should always be present.
  defaultFieldList.push('fields.*');

  return await callWithRequest(request, 'indices.putSettings', {
    index: indexName,
    body: {
      index: { query: { default_field: defaultFieldList } },
    },
  });
};

/**
 * Field types used by Metricbeat to generate the default_field setting.
 * Matches Beats code here:
 * https://github.com/elastic/beats/blob/eee127cb59b56f2ed7c7e317398c3f79c4158216/libbeat/template/processor.go#L104
 */
const DEFAULT_FIELD_TYPES: ReadonlySet<string> = new Set(['keyword', 'text', 'ip']);

/**
 * Recursively walks an index mapping and returns a flat array of dot-delimited
 * strings represent all fields that are of a type included in `DEFAULT_FIELD_TYPES`
 * @param mapping
 */
export const getDefaultFieldList = (mapping: MappingProperties): string[] =>
  Object.getOwnPropertyNames(mapping).reduce(
    (defaultFields, fieldName) => {
      const { type, properties } = mapping[fieldName];

      if (type && DEFAULT_FIELD_TYPES.has(type)) {
        defaultFields.push(fieldName);
      } else if (properties) {
        getDefaultFieldList(properties).forEach(subField =>
          defaultFields.push(`${fieldName}.${subField}`)
        );
      }

      return defaultFields;
    },
    [] as string[]
  );
