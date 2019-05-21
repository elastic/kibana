/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { boomify } from 'boom';
import { InfraBackendLibs } from '../../lib/infra_types';
import { InfraWrappableRequest } from '../../lib/adapters/framework';
import { AvailableFieldsRequest, AvailableFieldsResponse } from './types';
import { getSampleFieldNames } from './helpers/get_sample_field_names';

type AvailableFieldsWrappedRequest = InfraWrappableRequest<AvailableFieldsRequest>;

const availableFieldsSchema = Joi.object({
  timeField: Joi.string().required(),
  indexPattern: Joi.string().required(),
});

export const initAvailableFieldsAPI = ({ framework }: InfraBackendLibs) => {
  const { callWithRequest } = framework;
  framework.registerRoute<AvailableFieldsWrappedRequest, Promise<AvailableFieldsResponse>>({
    method: 'POST',
    path: '/api/infra/available_fields',
    options: {
      validate: { payload: availableFieldsSchema },
    },
    handler: async req => {
      const search = <Aggregation>(searchOptions: object) =>
        callWithRequest<{}, Aggregation>(req, 'search', searchOptions);
      try {
        const indexPatternsService = framework.getIndexPatternsService(req);
        const fields: FieldDescriptor = await indexPatternsService.getFieldsForWildcard({
          pattern: req.payload.indexPattern,
        });
        const sampleFieldNames = await getSampleFieldNames(search, req.payload);
        return {
          fields: fields
            .filter(f => sampleFieldNames.includes(f.name))
            .map(f => ({
              name: f.name,
              type: f.type,
              aggregatable: f.aggregatable,
              searchable: f.searchable,
            })),
        };
      } catch (e) {
        throw boomify(e);
      }
    },
  });
};
