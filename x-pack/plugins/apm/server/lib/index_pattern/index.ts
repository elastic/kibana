/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup } from 'src/core/server';
import { getSavedObjectsClient } from '../helpers/saved_objects_client';
import indexPattern from '../../../../../../src/legacy/core_plugins/kibana/server/tutorials/apm/index_pattern.json';

export async function ensureIndexPatternExists(core: CoreSetup) {
  const { server } = core.http;
  const config = server.config();
  const apmIndexPatternTitle = config.get('apm_oss.indexPattern');
  const savedObjectsClient = getSavedObjectsClient(server);
  const savedObjects = [
    {
      ...indexPattern,
      attributes: {
        ...indexPattern.attributes,
        title: apmIndexPatternTitle
      }
    }
  ];
  await savedObjectsClient.bulkCreate(savedObjects, { overwrite: false });
}
