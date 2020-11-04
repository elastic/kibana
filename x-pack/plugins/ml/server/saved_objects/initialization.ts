/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient, CoreStart } from 'kibana/server';
import { getInternalSavedObjectsClient } from './util';
import { repairFactory } from './repair';
import { jobSavedObjectServiceFactory } from './service';
import { mlLog } from '../lib/log';

export function jobInitializationFactory(core: CoreStart) {
  const client = core.elasticsearch.client;

  async function initializeJobs() {
    try {
      if (await _needsInitializing()) {
        mlLog.info('Initializing job saved objects');
        const savedObjectsClient = getInternalSavedObjectsClient(core);
        const jobSavedObjectService = jobSavedObjectServiceFactory(savedObjectsClient);
        const { initSavedObjects } = repairFactory(
          (client as unknown) as IScopedClusterClient,
          jobSavedObjectService
        );
        await initSavedObjects();
        mlLog.info('Job saved objects initialized for * space');
      }
    } catch (error) {
      mlLog.error('Error Initializing jobs');
    }
  }

  async function _needsInitializing() {
    if (await _jobSavedObjectsExist()) {
      // at least one ml saved object exists
      // this has been initialized before
      return false;
    }

    if (await _jobsExist()) {
      // some ml jobs exist, we need to create those saved objects
      return true;
    }

    // no ml jobs actually exist,
    // that's why there were no saved objects
    return false;
  }

  async function _jobSavedObjectsExist(size: number = 1) {
    const { body } = await client.asInternalUser.search({
      index: '.kibana*',
      size,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  type: 'ml-job',
                },
              },
            ],
          },
        },
      },
    });

    return body.hits.total.value > 0;
  }

  async function _jobsExist() {
    // it would be better to use a simple count search here
    // but the kibana user does not have access to .ml-config
    //
    // const { body } = await client.asInternalUser.count({
    //   index: '.ml-config',
    // });
    // return body.count > 0;

    const { body: adJobs } = await client.asInternalUser.ml.getJobs<{ count: number }>();
    const { body: dfaJobs } = await client.asInternalUser.ml.getDataFrameAnalytics<{
      count: number;
    }>();
    return adJobs.count > 0 || dfaJobs.count > 0;
  }

  return { initializeJobs };
}
