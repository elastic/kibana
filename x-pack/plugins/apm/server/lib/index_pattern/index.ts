/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';
// @ts-ignore
import { getSavedObjects } from '../../../../../../src/legacy/core_plugins/kibana/server/tutorials/apm/saved_objects/get_saved_objects';
import { getSavedObjectsClient } from '../helpers/saved_objects_client';

export async function ensureIndexPatternExists(server: Server) {
  const config = server.config();
  const apmIndexPatternTitle = config.get('apm_oss.indexPattern');
  const savedObjectsClient = getSavedObjectsClient(server);
  const apmIndexPatternSearchResp = await savedObjectsClient.find({
    type: 'index-pattern',
    search: `"${apmIndexPatternTitle}"`,
    searchFields: ['title'],
    perPage: 200
  });
  if (apmIndexPatternSearchResp.total === 0) {
    const savedObjects = getSavedObjects(apmIndexPatternTitle);
    await savedObjectsClient.bulkCreate(savedObjects, { overwrite: false });
  }
}
