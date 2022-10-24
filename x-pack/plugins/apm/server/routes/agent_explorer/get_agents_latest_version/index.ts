/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInternalSavedObjectsClient } from '@kbn/apm-plugin/server/lib/helpers/get_internal_saved_objects_client';
import { CoreSetup, Logger } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { getAllAgentsName } from '../get_agent_url_repository';
import { getSavedAgentsVersion, saveAgentsVersion } from './agents_version_saved_object';
import { fetchAgentLatestReleaseVersion } from './fetch_agents_latest_version';

const getAllAgentsLatestVersion = async () => {

  const versionsReq = await Promise.allSettled(
    getAllAgentsName().map((agent) => fetchAgentLatestReleaseVersion(agent)),
  );

  const versions = versionsReq.map((res) => (res as any).value);

  return Object.assign({}, ...versions);
}

export async function getAgentsLatestVersion({
  core,
  logger,
} : {
  core: CoreSetup;
  logger: Logger;
}) {
  const savedObjectsClient = await getInternalSavedObjectsClient(core);
  
  const savedAgentsVersion = await getSavedAgentsVersion({savedObjectsClient, logger});
  if (!isEmpty(savedAgentsVersion)) {
    return savedAgentsVersion;
  }

  const agentsVersion = await getAllAgentsLatestVersion();
  await saveAgentsVersion({savedObjectsClient, agentsVersion});

  return agentsVersion;
}
