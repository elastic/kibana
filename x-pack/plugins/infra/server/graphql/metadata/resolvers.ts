/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers } from '../../graphql/types';
import { InfraMetadataDomain } from '../../lib/domains/metadata_domain';
import { ChildResolverOf, InfraResolverOf } from '../../utils/typed_resolvers';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMetadataByNodeResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceResolvers.MetadataByNodeResolver>,
  QuerySourceResolver
>;

export const createMetadataResolvers = (libs: {
  metadata: InfraMetadataDomain;
}): {
  InfraSource: {
    metadataByNode: InfraSourceMetadataByNodeResolver;
  };
} => ({
  InfraSource: {
    async metadataByNode(source, args, { req }) {
      const result = await libs.metadata.getMetadata(req, source.id, args.nodeId, args.nodeType);
      return result;
    },
  },
});
