/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migration890 } from './8.9.0';
import { migration860 } from './8.6.0';
import { migration880 } from './8.8.0';

export const monitorMigrations = {
  '8.6.0': migration860,
  '8.8.0': migration880,
  '8.9.0': migration890,
};
