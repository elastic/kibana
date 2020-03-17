/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { IndexPatternService } from '../../ingest_manager/server';
import { EndpointAppConstants } from '../common/types';

const fallbackIndexPatterns: Record<string, string> = {
  events: 'events-endpoint-*',
  metadata: 'metadata-endpoint-*',
};

export async function getIndexPattern(
  indexPatternService: IndexPatternService,
  savedObjectsClient: SavedObjectsClientContract,
  datasetPath: string,
  log: Logger,
  version?: string
): Promise<string> {
  const pattern = await indexPatternService.get(
    savedObjectsClient,
    EndpointAppConstants.ENDPOINT_PACKAGE_NAME,
    datasetPath,
    version
  );

  if (!pattern) {
    log.warn(
      `Failed to retrieve index pattern from ingest manager dataset: ${datasetPath} version: ${version} finding default`
    );

    const defaultPattern = fallbackIndexPatterns[datasetPath];
    if (!defaultPattern) {
      log.warn(`Failed to retrieve default index pattern ${datasetPath}`);
      throw new Error('Invalid dataset used, unable to find default index pattern');
    }
    return defaultPattern;
  }

  return pattern;
}
