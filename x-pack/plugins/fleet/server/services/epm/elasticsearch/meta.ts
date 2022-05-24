/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeLoad, safeDump } from 'js-yaml';

import type { ESAssetMetadata } from '../../../../common/types';

const MANAGED_BY_DEFAULT = 'fleet';

/**
 * Build common metadata object for Elasticsearch assets installed by Fleet. Result should be
 * stored on a `_meta` field on the generated assets.
 */
export function getESAssetMetadata({
  packageName,
}: { packageName?: string } = {}): ESAssetMetadata {
  const meta: ESAssetMetadata = {
    managed_by: MANAGED_BY_DEFAULT,
    managed: true,
  };

  if (packageName) {
    meta.package = {
      name: packageName,
    };
  }

  return meta;
}

export function appendMetadataToIngestPipeline({
  pipeline,
  packageName,
}: {
  pipeline: any;
  packageName?: string;
}): any {
  const meta = getESAssetMetadata({ packageName });

  if (pipeline.extension === 'yml') {
    // Convert the YML content to JSON, append the `_meta` value, then convert it back to
    // YML and return the resulting YML
    const parsedPipelineContent = safeLoad(pipeline.contentForInstallation);
    parsedPipelineContent._meta = meta;

    return {
      ...pipeline,
      contentForInstallation: `---\n${safeDump(parsedPipelineContent)}`,
    };
  }

  const parsedPipelineContent = JSON.parse(pipeline.contentForInstallation);
  parsedPipelineContent._meta = meta;

  return {
    ...pipeline,
    contentForInstallation: parsedPipelineContent,
  };
}
