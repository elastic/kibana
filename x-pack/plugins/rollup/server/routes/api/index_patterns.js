/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { getCapabilitiesForIndexName } from '../../lib/map_capabilities';

import indexBy from 'lodash/collection/indexBy';

export function registerFieldsForWildcardRoute(server) {
  const isEsError = isEsErrorFactory(server);

  server.route({
    path: '/api/index_patterns/rollup/_fields_for_wildcard',
    method: 'GET',
    config: {
      handler: async (request, reply) => {
        const {
          pattern: indexName,
          fields,
          meta_fields: metaFields,
        } = request.query;

        const fieldsFromIndex = indexBy(JSON.parse(fields), 'name');
        const callWithRequest = callWithRequestFactory(server, request);

        try {
          const allCapabilities = await callWithRequest('rollup.capabilities', {
            indices: '_all'
          });

          const rollupFields = [];
          const indexCapabilities = getCapabilitiesForIndexName(allCapabilities, indexName);
          const jobs = indexCapabilities && Object.keys(indexCapabilities);
          const fieldsFromFieldCapsByName = jobs && indexCapabilities[jobs[0]].fields;

          // Keep meta fields
          JSON.parse(metaFields).forEach(field => fieldsFromIndex[field] && rollupFields.push(fieldsFromIndex[field]));

          // Map rollup capabilities
          Object.keys(fieldsFromFieldCapsByName).forEach(capField => {
            const capabilities = fieldsFromFieldCapsByName[capField].reduce((aggs, cap) => aggs.push(cap.agg) && aggs, []);
            const defaultField = {
              name: capField,
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
            };

            if(capabilities.includes('date_histogram')) {
              rollupFields.push({
                ...fieldsFromIndex[`${capField}.date_histogram.timestamp`],
                ...defaultField,
              });
            } else if(capabilities.includes('histogram')) {
              rollupFields.push({
                ...fieldsFromIndex[`${capField}.histogram.value`],
                ...defaultField,
              });
            } else if(capabilities.includes('terms')) {
              rollupFields.push({
                ...fieldsFromIndex[`${capField}.terms.value`],
                ...defaultField,
              });
            } else {
              rollupFields.push({
                ...defaultField,
                type: 'number',
                searchable: false,
              });
            }
          });

          return reply({
            fields: rollupFields,
          });
        } catch(err) {
          if (isEsError(err)) {
            return reply(wrapEsError(err));
          }
          reply(wrapUnknownError(err));
        }
      }
    }
  });
}
