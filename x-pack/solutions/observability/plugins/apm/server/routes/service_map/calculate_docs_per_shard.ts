/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Params {
  serviceMapMaxAllowableBytes: number;
  avgDocSizeInBytes: number;
  totalShards: number;
  numOfRequests: number;
}

export const calculateDocsPerShard = ({
  serviceMapMaxAllowableBytes,
  avgDocSizeInBytes,
  totalShards,
  numOfRequests,
}: Params): number => {
  if (
    serviceMapMaxAllowableBytes <= 0 ||
    avgDocSizeInBytes <= 0 ||
    totalShards <= 0 ||
    numOfRequests <= 0
  ) {
    throw new Error('all parameters must be > 0');
  }
  const bytesPerRequest = Math.floor(serviceMapMaxAllowableBytes / numOfRequests);
  const totalNumDocsAllowed = Math.floor(bytesPerRequest / avgDocSizeInBytes);
  const numDocsPerShardAllowed = Math.floor(totalNumDocsAllowed / totalShards);

  return numDocsPerShardAllowed;
};
