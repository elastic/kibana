/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { objectValuesToArrays } from '../../lib/helper';
import { API_URLS } from '../../../common/constants';

const arrayOrStringType = schema.maybe(
  schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
);

export const createGetOverviewFilters: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.FILTERS,
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      search: schema.maybe(schema.string()),
      locations: arrayOrStringType,
      schemes: arrayOrStringType,
      ports: arrayOrStringType,
      tags: arrayOrStringType,
      _inspect: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, locations, schemes, search, ports, tags } = request.query;

    let parsedSearch: Record<string, any> | undefined;
    if (search) {
      try {
        parsedSearch = JSON.parse(search);
      } catch (e) {
        return response.badRequest({ body: { message: e.message } });
      }
    }

    try {
      return await libs.requests.getFilterBar({
        uptimeEsClient,
        dateRangeStart,
        dateRangeEnd,
        search: parsedSearch,
        filterOptions: objectValuesToArrays<string>({
          locations,
          ports,
          schemes,
          tags,
        }),
      });
    } catch (e) {
      /**
       * This particular error is usually indicative of a mapping problem within the user's
       * indices. It's relevant for the UI because we will be able to provide the user with a
       * tailored message to help them remediate this problem on their own with minimal effort.
       */
      if (e.name === 'ResponseError') {
        return response.badRequest({ body: e });
      }
      throw e;
    }
  },
});
