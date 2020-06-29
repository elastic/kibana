/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { cloneDeep } from 'lodash';
import { AgentConfig } from '../../types';

type Pre790AgentConfig = Exclude<AgentConfig, 'updated_at'> & {
  updated_on: string;
};

export const migrateAgentConfigToV790: SavedObjectMigrationFn<Pre790AgentConfig, AgentConfig> = (
  doc
) => {
  const updatedAgentConfig = cloneDeep(doc);

  updatedAgentConfig.attributes.updated_at = doc.attributes.updated_on;
  delete updatedAgentConfig.attributes.updated_on;

  return updatedAgentConfig;
};
