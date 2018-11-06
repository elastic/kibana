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
          fields: Joi.array(),
          params: Joi.object().keys({
            rollup_index: Joi.string().required(),
          }).default({})
        }).default()
      }
    },
    handler: async (request) => {
      const {
        meta_fields: metaFields,
        fields,
        params,
      } = request.query;

      const rollupIndex = params.rollup_index;
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const rollupFields = [];
        const rollupFieldNames = [];
        const fieldsFromFieldCapsApi = indexBy(fields, 'name');
        const rollupIndexCapabilities = getCapabilitiesForRollupIndices(await callWithRequest('rollup.rollupIndexCapabilities', {
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

          // Date histogram agg only ever has one field defined, let date type overwrite a
          // previous type if defined (such as number from max and min aggs).
          if(agg === 'date_histogram') {
            const timeFieldName = fields[0];
            const fieldCapsKey = `${timeFieldName}.${agg}.timestamp`;
            const newField = {
              ...fieldsFromFieldCapsApi[fieldCapsKey],
              ...defaultField,
              name: timeFieldName,
            };
            const existingField = rollupFields.find(field => field.name === timeFieldName);

            if(existingField) {
              Object.assign(existingField, newField);
            } else {
              rollupFieldNames.push(timeFieldName);
              rollupFields.push(newField);
            }
          }
          // For all other aggs, filter out ones that have already been added to the field list
          // because the same field can be part of multiple aggregations, but end consumption
          // doesn't differentiate fields based on their aggregation abilities.
          else {
            rollupFields.push(
              ...fields
                .filter(field => !rollupFieldNames.includes(field))
                .map(field => {
                  // Expand each field into object format that end consumption expects.
                  const fieldCapsKey = `${field}.${agg}.value`;
                  rollupFieldNames.push(field);
                  return {
                    ...fieldsFromFieldCapsApi[fieldCapsKey],
                    ...defaultField,
                    name: field,
                  };
                })
            );
          }
        });

        return {
          fields: rollupFields
        };
      } catch(err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }
        return wrapUnknownError(err);
      }
    }
  });
}
