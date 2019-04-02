/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { Hosts } from '../../lib/hosts';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryHostsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.HostsResolver>,
  QuerySourceResolver
>;

export interface HostsResolversDeps {
  hosts: Hosts;
}

export const createHostsResolvers = (
  libs: HostsResolversDeps
): {
  Source: {
    Hosts: QueryHostsResolver;
  };
} => ({
  Source: {
    async Hosts(source, args, { req }, info) {
      const options = createOptions(source, args, info);
      return libs.hosts.getHosts(req, options);
    },
  },
});
