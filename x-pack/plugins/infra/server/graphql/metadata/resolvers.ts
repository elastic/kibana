/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers } from '../../../common/graphql/types';
import { InfraResolvedResult, InfraResolverOf } from '../../lib/adapters/framework';
import { InfraMetadataDomain } from '../../lib/domains/metadata_domain';
import { InfraContext } from '../../lib/infra_types';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMetadataByNodeResolver = InfraResolverOf<
  InfraSourceResolvers.MetadataByNodeResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
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
      const result = await libs.metadata.getMetadata(req, source.id, args.nodeName, args.nodeType);
      return result;
    },
  },
});
