/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { Authentications } from '../../lib/authentications';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { createOptionsPaginated } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryAuthenticationsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.AuthenticationsResolver>,
  QuerySourceResolver
>;

export interface AuthenticationsResolversDeps {
  authentications: Authentications;
}

export const createAuthenticationsResolvers = (
  libs: AuthenticationsResolversDeps
): {
  Source: {
    Authentications: QueryAuthenticationsResolver;
  };
} => ({
  Source: {
    async Authentications(source, args, { req }, info) {
      const options = createOptionsPaginated(source, args, info);
      return libs.authentications.getAuthentications(req, options);
    },
  },
});
