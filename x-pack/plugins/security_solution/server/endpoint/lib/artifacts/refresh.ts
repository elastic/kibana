/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import { ExceptionListClient } from '../../../../../lists/server';

import { InternalArtifactSchema } from '../../schemas/artifacts';
import { EndpointAppContext } from '../../types';

import { ArtifactConstants, ManifestConstants } from './common';
import { GetFullEndpointExceptionList, CompressExceptionList } from './lists';
import { Manifest } from './manifest';

const buildExceptionListArtifacts = async (
  schemaVersion: string,
  exceptionListClient: ExceptionListClient
): Promise<InternalArtifactSchema[]> => {
  const artifacts: InternalArtifactSchema[] = [];

  for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
    const exceptions = await GetFullEndpointExceptionList(exceptionListClient, os, schemaVersion);

    const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

    const sha256 = createHash('sha256')
      .update(compressedExceptions.toString('utf8'), 'utf8')
      .digest('hex');

    artifacts.push({
      identifier: `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}-${schemaVersion}`,
      sha256,
      encoding: 'xz',
      created: Date.now(),
      body: compressedExceptions.toString('binary'),
      size: Buffer.from(JSON.stringify(exceptions)).byteLength,
    });
  }

  return artifacts;
};

export const refreshManifest = async (context: EndpointAppContext, createInitial: boolean) => {
  const exceptionListClient = context.service.getExceptionListClient();
  const logger = context.logFactory.get('endpoint-artifact-refresh');

  if (exceptionListClient === undefined) {
    logger.debug('Lists plugin not available. Unable to refresh manifest.');
    return;
  }

  const artifactService = context.service.getArtifactService();
  const manifestService = context.service.getManifestService();

  let oldManifest: Manifest;

  // Get the last-dispatched manifest
  try {
    oldManifest = await manifestService.getManifest(ManifestConstants.SCHEMA_VERSION);
  } catch (err) {
    // TODO: does this need to be more specific?
    // 1. could fail pulling artifacts
    // 2. could fail if manifest does not exist yet
    if (createInitial) {
      // TODO: implement this when ready to integrate with Paul's code
      oldManifest = new Manifest(ManifestConstants.SCHEMA_VERSION); // create empty manifest
    } else {
      throw err;
    }
  }

  // Build new exception list artifacts
  const artifacts = await buildExceptionListArtifacts(
    ArtifactConstants.SCHEMA_VERSION,
    exceptionListClient
  );

  // Build new manifest
  const newManifest = Manifest.fromArtifacts(artifacts, ManifestConstants.SCHEMA_VERSION);
  newManifest.setVersion(oldManifest.getVersion());

  // Get diffs
  const diffs = newManifest.diff(oldManifest);

  // Create new artifacts
  diffs.forEach(async (diff) => {
    if (diff.type === 'add') {
      const artifact = newManifest.getArtifact(diff.id);
      try {
        await artifactService.createArtifact(artifact);
      } catch (err) {
        if (err.status === 409) {
          // This artifact already existed...
          logger.debug(
            `Tried to create artifact ${artifact.identifier}-${artifact.sha256}, but it already exists.`
          );
        } else {
          throw err;
        }
      }
    }
  });

  // Dispatch manifest if new
  if (diffs.length > 0) {
    try {
      logger.debug('Dispatching new manifest');
      await manifestService.dispatchAndUpdate(newManifest);
    } catch (err) {
      logger.error(err);
      return;
    }
  }

  // Clean up old artifacts
  diffs.forEach(async (diff) => {
    try {
      if (diff.type === 'delete') {
        await artifactService.delete(diff.id);
      }
    } catch (err) {
      logger.error(err);
    }
  });
};
