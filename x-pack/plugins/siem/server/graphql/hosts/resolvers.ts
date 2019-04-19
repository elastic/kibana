/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { Hosts } from '../../lib/hosts';
import { getFields } from '../../utils/build_query';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryHostsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.HostsResolver>,
  QuerySourceResolver
>;

type QueryHostDetailsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.HostDetailsResolver>,
  QuerySourceResolver
>;

type QueryHostFirstLastSeenResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.HostFirstLastSeenResolver>,
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
    HostDetails: QueryHostDetailsResolver;
    HostFirstLastSeen: QueryHostFirstLastSeenResolver;
  };
} => ({
  Source: {
    async Hosts(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        sort: args.sort,
      };
      return libs.hosts.getHosts(req, options);
    },
    async HostDetails(source, args, { req }, info) {
      const fields = getFields(getOr([], 'fieldNodes[0]', info));
      const options = {
        sourceConfiguration: source.configuration,
        fields: fields.map(field => field.replace('edges.node.', '')),
        hostName: args.hostName,
        timerange: args.timerange,
      };
      return libs.hosts.getHostDetails(req, options);
    },
    async HostFirstLastSeen(source, args, { req }) {
      const options = { sourceConfiguration: source.configuration, hostName: args.hostName };
      return libs.hosts.getHostFirstLastSeen(req, options);
    },
  },
});
