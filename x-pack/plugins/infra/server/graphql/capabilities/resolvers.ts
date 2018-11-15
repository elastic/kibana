/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers } from '../../../common/graphql/types';
import { InfraResolvedResult, InfraResolverOf } from '../../lib/adapters/framework';
import { InfraCapabilitiesDomain } from '../../lib/domains/capabilities_domain';
import { InfraContext } from '../../lib/infra_types';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceCapabilitiesByNodeResolver = InfraResolverOf<
  InfraSourceResolvers.CapabilitiesByNodeResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export const createCapabilitiesResolvers = (libs: {
  capabilities: InfraCapabilitiesDomain;
}): {
  InfraSource: {
    capabilitiesByNode: InfraSourceCapabilitiesByNodeResolver;
  };
} => ({
  InfraSource: {
    async capabilitiesByNode(source, args, { req }) {
      const result = await libs.capabilities.getCapabilities(
        req,
        source.id,
        args.nodeName,
        args.nodeType
      );
      return result;
    },
  },
});
