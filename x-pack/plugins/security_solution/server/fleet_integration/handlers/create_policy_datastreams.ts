/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Logger } from '@kbn/logging';
import { ENDPOINT_HEARTBEAT_INDEX } from '../../../common/endpoint/constants';
import type { EndpointFleetServicesFactoryInterface } from '../../endpoint/services/fleet';
import { DEFAULT_DIAGNOSTIC_INDEX } from '../../lib/telemetry/constants';

const buildIndexNameWithNamespace = (
  indexNamePrefixOrPattern: string,
  namespace: string
): string => {
  if (indexNamePrefixOrPattern.endsWith('*')) {
    const hasDash = indexNamePrefixOrPattern.endsWith('-*');
    return `${indexNamePrefixOrPattern.substring(0, indexNamePrefixOrPattern.length - 1)}${
      hasDash ? '' : '-'
    }${namespace}`;
  }

  return `${indexNamePrefixOrPattern}${
    indexNamePrefixOrPattern.endsWith('-') ? '' : '-'
  }${namespace}`;
};

const staticIndices: Readonly<string[]> = [
  ENDPOINT_HEARTBEAT_INDEX, // FIXME:PT is this serverless only?
  buildIndexNameWithNamespace(DEFAULT_DIAGNOSTIC_INDEX, 'default'),
];

export interface CreatePolicyDataStreamsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  fleetServicesFactory: EndpointFleetServicesFactoryInterface;
  integrationPolicy: PackagePolicy;
}

/**
 * Ensures that the DOT index Datastreams necessary to support Elastic Defend are crated (prior to
 * endpoint writing data to them)
 */
export const createPolicyDataStreamsIfNeeded = async ({
  logger,
  integrationPolicy,
}: CreatePolicyDataStreamsOptions): Promise<void> => {
  logger.debug(
    `Checking if datastream need to be created for Endpoint integration policy [${integrationPolicy.name} (${integrationPolicy.id})]]`
  );
  // TODO:PT add caching
};
