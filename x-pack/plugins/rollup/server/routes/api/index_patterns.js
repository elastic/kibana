/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import Joi from 'joi';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import indexBy from 'lodash/collection/indexBy';
import { getCapabilitiesForRollupIndices } from '../../lib/map_capabilities';
import { getFieldCapabilities } from '../../../../../../src/server/index_patterns/service/lib/field_capabilities';


/**
 * Get list of fields for rollup index pattern, in the format of regular index pattern fields
 */
export function registerFieldsForWildcardRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_patterns/rollup/_fields_for_wildcard',
    method: 'GET',
    config: {
      pre: [ licensePreRouting ],
      validate: {
        query: Joi.object().keys({
          pattern: Joi.string(),
          meta_fields: Joi.array().items(Joi.string()).default([]),
          params: Joi.object().keys({
            rollup_index: Joi.string().required(),
          }).default({})
        }).default()
      }
    },
    handler: async (request, reply) => {
      const {
        meta_fields: metaFields,
        params,
      } = request.query;

      const rollupIndex = params.rollup_index;
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const rollupFields = [];
        const rollupFieldNames = [];
        const fieldsFromFieldCapsApi = indexBy(await getFieldCapabilities(callWithRequest, [rollupIndex], metaFields), 'name');
        const rollupIndexCapabilities = getCapabilitiesForRollupIndices(await callWithRequest('rollup.capabilitiesByRollupIndex', {
          indexPattern: rollupIndex
        }))[rollupIndex].aggs;

        // Keep meta fields
        metaFields.forEach(field => fieldsFromFieldCapsApi[field] && rollupFields.push(fieldsFromFieldCapsApi[field]));

        // Merge rollup capabilities information with field information
        Object.keys(rollupIndexCapabilities).forEach(agg => {

          // Field names of the aggregation
          const fields = Object.keys(rollupIndexCapabilities[agg]);

          // Default field information
          const defaultField = {
            name: null,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
          };

          rollupFields.push(
            ...fields
              // For each field of the aggregation, filter out ones that have already been added
              // to the field list bcause the same field can be part of multiple aggregations, but
              // end consumption doesn't differentiate fields based on their aggregation abilities.
              .filter(field => !rollupFieldNames.includes(field))
              // Then expand each field into object format that end consumption expects.
              .map(field => {
                const fieldCapsKey = `${field}.${agg}.${agg === 'date_histogram' ? 'timestamp' : 'value'}`;
                rollupFieldNames.push(field);
                return {
                  ...fieldsFromFieldCapsApi[fieldCapsKey],
                  ...defaultField,
                  name: field,
                };
              })
          );
        });
        return reply({
          fields: rollupFields
        });

      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }
        reply(wrapUnknownError(err));
      }
    }
  });
}
