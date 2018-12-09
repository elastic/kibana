/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers } from '../../../common/graphql/types';
import { InfraResolvedResult, InfraResolverOf } from '../../lib/adapters/framework';
import { InfraMetadataDomain } from '../../lib/domains/metadata_domain';
import { InfraContext } from '../../lib/infra_types';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMetadataByNodeResolver = InfraResolverOf<
  InfraSourceResolvers.MetadataByNodeResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

type InfraSourceServiceMetadataBetweenResolver = InfraResolverOf<
  InfraSourceResolvers.ServiceMetadataBetweenResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export const createMetadataResolvers = (libs: {
  metadata: InfraMetadataDomain;
}): {
  InfraSource: {
    metadataByNode: InfraSourceMetadataByNodeResolver;
    serviceMetadataBetween: InfraSourceServiceMetadataBetweenResolver;
  };
} => ({
  InfraSource: {
    async metadataByNode(source, args, { req }) {
      const result = await libs.metadata.getMetadata(req, source.id, args.nodeName, args.nodeType);
      return result;
    },
    async serviceMetadataBetween(source, args, { req }) {
      const result = await libs.metadata.getServiceMetadata(
        req,
        source.id,
        args.start,
        args.end,
        parseFilterQuery(args.filterQuery)
      );
      return result;
    },
  },
});
