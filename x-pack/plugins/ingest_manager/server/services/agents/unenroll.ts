/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AgentSOAttributes } from '../../types';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';

export async function unenrollAgents(
  soClient: SavedObjectsClientContract,
  toUnenrollIds: string[]
) {
  const response = [];
  for (const id of toUnenrollIds) {
    try {
      await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, id, {
        active: false,
      });
      response.push({
        id,
        success: true,
      });
    } catch (error) {
      response.push({
        id,
        error,
        success: false,
      });
    }
  }

  return response;
}
