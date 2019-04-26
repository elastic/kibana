/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { IpDetails, TlsRequestOptions } from '../../lib/ip_details';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryIpOverviewResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.IpOverviewResolver>,
  QuerySourceResolver
>;

export type QueryDomainsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.DomainsResolver>,
  QuerySourceResolver
>;

export type QueryTlsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.TlsResolver>,
  QuerySourceResolver
>;

type QueryDomainFirstLastSeenResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.DomainFirstLastSeenResolver>,
  QuerySourceResolver
>;

export interface IDetailsResolversDeps {
  ipDetails: IpDetails;
}

export const createIpDetailsResolvers = (
  libs: IDetailsResolversDeps
): {
  Source: {
    IpOverview: QueryIpOverviewResolver;
    Domains: QueryDomainsResolver;
    Tls: QueryTlsResolver;
    DomainFirstLastSeen: QueryDomainFirstLastSeenResolver;
  };
} => ({
  Source: {
    async IpOverview(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info), ip: args.ip };
      return libs.ipDetails.getIpOverview(req, options);
    },
    async Domains(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        ip: args.ip,
        domainsSortField: args.sort,
        flowTarget: args.flowTarget,
        flowDirection: args.flowDirection,
      };
      return libs.ipDetails.getDomains(req, options);
    },
    async Tls(source, args, { req }, info) {
      const options: TlsRequestOptions = {
        ...createOptions(source, args, info),
        ip: args.ip,
        tlsSortField: args.sort,
        flowTarget: args.flowTarget,
      };
      return libs.ipDetails.getTls(req, options);
    },
    async DomainFirstLastSeen(source, args, { req }) {
      const options = {
        sourceConfiguration: source.configuration,
        ip: args.ip,
        domainName: args.domainName,
        flowTarget: args.flowTarget,
      };
      return libs.ipDetails.getDomainFirstLastSeen(req, options);
    },
  },
});
