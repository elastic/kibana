/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './user';

export interface ExternalServicePersisted {
  connector_name: string;
  external_id: string;
  external_title: string;
  external_url: string;
  pushed_at: string;
  pushed_by: User;
}
