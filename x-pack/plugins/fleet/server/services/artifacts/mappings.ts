/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Artifact, ArtifactElasticsearchProperties } from './types';
import { ESSearchHit } from '../../../../../typings/elasticsearch';
import { esKuery } from '../../../../../../src/plugins/data/server';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/common';

export const esSearchHitToArtifact = <
  T extends Pick<ESSearchHit<ArtifactElasticsearchProperties>, '_id' | '_source'>
>(
  searchHit: T
): Artifact => {
  return {
    ...searchHit._source,
    id: searchHit._id,
  };
};

export const relativeDownloadUrlFromArtifact = <
  T extends Pick<Artifact, 'identifier' | 'decodedSha256'>
>({
  identifier,
  decodedSha256,
}: T): string => {
  return `/api/artifact/${identifier}/${decodedSha256}`;
};

export const kueryToArtifactsElasticsearchQuery = (
  packageName: string,
  kuery?: string
): JsonObject => {
  // All filtering for artifacts should be bound to the `packageName`, so we insert
  // that into the KQL value and use `AND` to add the defined `kuery` (if any) to it.
  return esKuery.toElasticsearchQuery(
    esKuery.fromKueryExpression(
      `(packageName: "${packageName}")${(kuery && ` AND (${kuery})`) || ''}`
    )
  );
};
