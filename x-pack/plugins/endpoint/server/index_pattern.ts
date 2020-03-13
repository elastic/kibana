/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { IndexPatternService } from '../../ingest_manager/server';
import { EndpointAppConstants } from '../common/types';

export async function getIndexPattern(
  indexPatternService: IndexPatternService,
  savedObjectsClient: SavedObjectsClientContract,
  datasetPath: string,
  version?: string
): Promise<string> {
  const pattern = await indexPatternService.get(
    savedObjectsClient,
    EndpointAppConstants.ENDPOINT_PACKAGE_NAME,
    datasetPath,
    version
  );
  if (!pattern) {
    throw new Error('Failed to retrieve index pattern');
  }
  return pattern;
}
