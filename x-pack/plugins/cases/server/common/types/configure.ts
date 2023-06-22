/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorPersisted } from './connectors';
import type { User } from './user';

export interface ConfigurePersistedAttributes {
  connector: ConnectorPersisted;
  closure_type: string;
  owner: string;
  created_at: string;
  created_by: User;
  updated_at: string | null;
  updated_by: User | null;
}
