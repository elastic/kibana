/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { SourceResolvers } from '../../graphql/types';
import { Authorizations } from '../../lib/authorizations';
import { AuthorizationsRequestOptions } from '../../lib/authorizations/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { getFields } from '../../utils/build_query/fields';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryAuthorizationsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.AuthorizationsResolver>,
  QuerySourceResolver
>;

export interface AuthorizationsResolversDeps {
  authorizations: Authorizations;
}

export const createAuthorizationsResolvers = (
  libs: AuthorizationsResolversDeps
): {
  Source: {
    Authorizations: QueryAuthorizationsResolver;
  };
} => ({
  Source: {
    async Authorizations(source, args, { req }, info) {
      const fields = getFields(getOr([], 'fieldNodes[0]', info));
      const options: AuthorizationsRequestOptions = {
        sourceConfiguration: source.configuration,
        timerange: args.timerange,
        pagination: args.pagination,
        filterQuery: parseFilterQuery(args.filterQuery || ''),
        fields: fields.map(field => field.replace('edges.node.', '')),
      };
      return libs.authorizations.getAuthorizations(req, options);
    },
  },
});
