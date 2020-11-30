/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient, CoreStart, SavedObjectsClientContract } from 'kibana/server';
import { savedObjectClientsFactory } from '../util';
import { syncSavedObjectsFactory } from '../sync';
import { jobSavedObjectServiceFactory, JobObject } from '../service';
import { mlLog } from '../../lib/log';
import { ML_SAVED_OBJECT_TYPE } from '../../../common/types/saved_objects';
import { createJobSpaceOverrides } from './space_overrides';
import type { SecurityPluginSetup } from '../../../../security/server';

/**
 * Creates initializeJobs function which is used to check whether
 * ml job saved objects exist and creates them if needed
 *
 * @param core: CoreStart
 */
export function jobSavedObjectsInitializationFactory(
  core: CoreStart,
  security: SecurityPluginSetup | undefined,
  spacesEnabled: boolean
) {
  const client = (core.elasticsearch.client as unknown) as IScopedClusterClient;

  /**
   * Check whether ML saved objects exist.
   * If they don't, check to see whether ML jobs exist.
   * If jobs exist, but the saved objects do not, create the saved objects.
   *
   */
  async function initializeJobs() {
    try {
      const { getInternalSavedObjectsClient } = savedObjectClientsFactory(() => core.savedObjects);
      const savedObjectsClient = getInternalSavedObjectsClient();
      if (savedObjectsClient === null) {
        mlLog.error('Internal saved object client not initialized!');
        return;
      }

      if ((await _needsInitializing(savedObjectsClient)) === false) {
        // ml job saved objects have already been initialized
        return;
      }

      const jobSavedObjectService = jobSavedObjectServiceFactory(
        savedObjectsClient,
        savedObjectsClient,
        spacesEnabled,
        security?.authz,
        () => Promise.resolve() // pretend isMlReady, to allow us to initialize the saved objects
      );

      mlLog.info('Initializing job saved objects');
      // create space overrides for specific jobs
      const jobSpaceOverrides = await createJobSpaceOverrides(client);
      // initialize jobs
      const { initSavedObjects } = syncSavedObjectsFactory(client, jobSavedObjectService);
      const { jobs } = await initSavedObjects(false, jobSpaceOverrides);
      mlLog.info(`${jobs.length} job saved objects initialized`);
    } catch (error) {
      mlLog.error(`Error Initializing jobs ${JSON.stringify(error)}`);
    }
  }

  async function _needsInitializing(savedObjectsClient: SavedObjectsClientContract) {
    if (await _jobSavedObjectsExist(savedObjectsClient)) {
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

  async function _jobSavedObjectsExist(savedObjectsClient: SavedObjectsClientContract) {
    const options = {
      type: ML_SAVED_OBJECT_TYPE,
      perPage: 0,
      namespaces: ['*'],
    };

    const { total } = await savedObjectsClient.find<JobObject>(options);
    return total > 0;
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
