/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Artifact, ArtifactElasticsearchProperties } from './types';
import { ESSearchHit } from '../../../../../typings/elasticsearch';
import { ARTIFACT_DOWNLOAD_RELATIVE_PATH } from './constants';

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
  return ARTIFACT_DOWNLOAD_RELATIVE_PATH.replace('{identifier}', identifier).replace(
    '{decodedSha256}',
    decodedSha256
  );
};
