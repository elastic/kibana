/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { buildIndexNameWithNamespace } from '../../../common/endpoint/utils/index_name_utilities';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { catchAndWrapError } from '../../endpoint/utils';
import type { SimpleMemCacheInterface } from '../../endpoint/lib/simple_mem_cache';
import { SimpleMemCache } from '../../endpoint/lib/simple_mem_cache';
import {
  DEFAULT_DIAGNOSTIC_INDEX_PATTERN,
  ENDPOINT_ACTION_RESPONSES_DS,
  ENDPOINT_HEARTBEAT_INDEX_PATTERN,
} from '../../../common/endpoint/constants';
import { stringify } from '../../endpoint/utils/stringify';

const cache = new SimpleMemCache({
  // Cache of created Datastreams last for 12h, at which point it is checked again.
  // This is just a safeguard case (for whatever reason) the index is deleted
  // 1.8e+7 ===  hours
  ttl: 1.8e7,
});

interface PolicyDataStreamsCreator {
  (options: CreatePolicyDataStreamsOptions): Promise<void>;
  cache: SimpleMemCacheInterface;
}

export interface CreatePolicyDataStreamsOptions {
  endpointServices: EndpointAppContextService;
  endpointPolicyIds: string[];
}

/**
 * Ensures that the DOT index Datastreams necessary to support Elastic Defend are crated (prior to
 * endpoint writing data to them)
 */
export const createPolicyDataStreamsIfNeeded: PolicyDataStreamsCreator = async ({
  endpointServices,
  endpointPolicyIds,
}: CreatePolicyDataStreamsOptions): Promise<void> => {
  const logger = endpointServices.createLogger('endpointPolicyDatastreamCreator');
  const esClient = endpointServices.getInternalEsClient();

  logger.debug(
    () =>
      `Checking if datastreams need to be created for Endpoint integration policy [${endpointPolicyIds.join(
        ', '
      )}]`
  );

  // FIXME:PT Need to ensure that the datastreams are created in all associated space ids that the policy is shared with
  //          This can be deferred to activity around support of Spaces - team issue: 8199 (epic)
  //          We might need to do much here other than to ensure we can access all policies across all spaces in order to get the namespace value

  const fleetServices = endpointServices.getInternalFleetServices();
  const policyNamespaces = await fleetServices.getPolicyNamespace({
    integrationPolicies: endpointPolicyIds,
  });
  const indexesCreated: string[] = [];
  const createErrors: string[] = [];
  const indicesToCreate: string[] = Array.from(
    Object.values(policyNamespaces.integrationPolicy).reduce<Set<string>>((acc, namespaceList) => {
      for (const namespace of namespaceList) {
        acc.add(buildIndexNameWithNamespace(DEFAULT_DIAGNOSTIC_INDEX_PATTERN, namespace));
        acc.add(buildIndexNameWithNamespace(ENDPOINT_ACTION_RESPONSES_DS, namespace));

        if (endpointServices.isServerless()) {
          acc.add(buildIndexNameWithNamespace(ENDPOINT_HEARTBEAT_INDEX_PATTERN, namespace));
        }
      }

      return acc;
    }, new Set<string>())
  );

  const processesDatastreamIndex = async (datastreamIndexName: string): Promise<void> => {
    if (cache.get(datastreamIndexName)) {
      return;
    }

    const doesDataStreamAlreadyExist = await esClient.indices
      .exists({ index: datastreamIndexName })
      .catch(catchAndWrapError);

    if (doesDataStreamAlreadyExist) {
      cache.set(datastreamIndexName, true);
      return;
    }

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
  };

  logger.debug(
    () =>
      `Checking if the following datastream(s) need to be created:\n    ${indicesToCreate.join(
        '\n    '
      )}`
  );

  await pMap(indicesToCreate, processesDatastreamIndex, { concurrency: 10 });

  if (indexesCreated.length > 0) {
    logger.info(
      `Datastream(s) created in support of Elastic Defend policy [${endpointPolicyIds.join(
        ', '
      )}]:\n    ${indexesCreated.join('\n    ')}`
    );
  } else if (createErrors.length === 0) {
    logger.debug(() => `Nothing to do. Datastreams already exist`);
  }

  if (createErrors.length > 0) {
    logger.error(
      `${createErrors.length} errors encountered:\n${createErrors.join('\n--------\n')}`
    );
  }
};
createPolicyDataStreamsIfNeeded.cache = cache;
