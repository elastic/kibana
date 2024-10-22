/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Logger } from '@kbn/logging';
import pMap from 'p-map';
import { catchAndWrapError } from '../../endpoint/utils';
import type { SimpleMemCacheInterface } from '../../endpoint/services/actions/clients/lib/simple_mem_cache';
import { SimpleMemCache } from '../../endpoint/services/actions/clients/lib/simple_mem_cache';
import {
  ENDPOINT_ACTION_RESPONSES_DS,
  ENDPOINT_HEARTBEAT_INDEX,
} from '../../../common/endpoint/constants';
import type { EndpointFleetServicesFactoryInterface } from '../../endpoint/services/fleet';
import { DEFAULT_DIAGNOSTIC_INDEX } from '../../lib/telemetry/constants';
import { stringify } from '../../endpoint/utils/stringify';

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

const cache = new SimpleMemCache({
  // Cache of created Datastreams last for 12h, at which point it is checked again.
  // This is just a safe guard case (for whatever reason) the index is deleted
  // 1.8e+7 ===  hours
  ttl: 1.8e7,
});

interface PolicyDataStreamsCreator {
  (options: CreatePolicyDataStreamsOptions): Promise<void>;
  cache: SimpleMemCacheInterface;

  // FIXME:PT move SimpleMemCache to top-level lib
}

export interface CreatePolicyDataStreamsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  fleetServicesFactory: EndpointFleetServicesFactoryInterface;
  isServerless?: boolean;
  integrationPolicy: PackagePolicy;
}

/**
 * Ensures that the DOT index Datastreams necessary to support Elastic Defend are crated (prior to
 * endpoint writing data to them)
 */
export const createPolicyDataStreamsIfNeeded: PolicyDataStreamsCreator = async ({
  logger,
  integrationPolicy,
  isServerless = false,
  esClient,
  fleetServicesFactory,
}: CreatePolicyDataStreamsOptions): Promise<void> => {
  logger.debug(
    `Checking if datastream need to be created for Endpoint integration policy [${integrationPolicy.name} (${integrationPolicy.id})]]`
  );

  // FIXME:PT Need to ensure that the datastreams are created in all associated space ids that the policy is shared with
  //          This can be deferred to activity around support of Spaces - team issue: 8199 (epic)
  //          We might need to do much here other than to ensure we can access all policies across all spaces in order to get the namespace value

  const fleetServices = fleetServicesFactory.asInternalUser();
  const policyNamespaces = await fleetServices.getPolicyNamespace({
    integrationPolicies: [integrationPolicy.id],
  });
  const indexesCreated: string[] = [];
  const createErrors: string[] = [];
  const indicesToCreate: string[] = [
    ...policyNamespaces.integrationPolicy[integrationPolicy.id]
      .map((namespace) => {
        return [
          buildIndexNameWithNamespace(DEFAULT_DIAGNOSTIC_INDEX, namespace),
          buildIndexNameWithNamespace(ENDPOINT_ACTION_RESPONSES_DS, namespace),
        ];
      })
      .flat(),
  ];

  if (isServerless) {
    // FIXME:PT DO NOT COMMIT until variable below is updated
    //       from PR https://github.com/elastic/kibana/pull/197291

    indicesToCreate.push(ENDPOINT_HEARTBEAT_INDEX);
  }

  const processesDatastreamIndex = async (datastreamIndexName: string): Promise<void> => {
    if (cache.get(datastreamIndexName)) {
      return;
    }

    if (!(await esClient.indices.exists({ index: datastreamIndexName }).catch(catchAndWrapError))) {
      await esClient.indices
        .createDataStream({ name: datastreamIndexName })
        .then(() => {
          indexesCreated.push(datastreamIndexName);
          cache.set(datastreamIndexName, true);
        })
        .catch((err) => {
          // It's possible that between the `.exists()` check and this `.createDataStream()` that
          // the index could have been created. If that's the case, then just ignore the error.
          if (err.body?.error?.type === 'resource_already_exists_exception') {
            cache.set(datastreamIndexName, true);
            return;
          }

          createErrors.push(
            `Attempt to create datastream [${datastreamIndexName}] failed:\n${stringify(
              err.body?.error ?? err
            )}`
          );
        });
    }
  };

  logger.debug(
    () =>
      `checking if the following datastream(s) need to be created:\n    ${indicesToCreate.join(
        '\n    '
      )}`
  );

  await pMap(indicesToCreate, processesDatastreamIndex, { concurrency: 10 });

  if (indexesCreated.length > 0) {
    logger.info(
      `Datastream(s) created in support of Elastic Defend:\n    ${indexesCreated.join('\n    ')}`
    );
  }

  if (createErrors.length > 0) {
    logger.error(
      `${createErrors.length} errors encountered:\n${createErrors.join('\n--------\n')}`
    );
  }
};
createPolicyDataStreamsIfNeeded.cache = cache;
