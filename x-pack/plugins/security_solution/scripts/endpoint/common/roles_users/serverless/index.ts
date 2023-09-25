/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

export const ES_RESOURCES = Object.freeze({
  roles: resolve('./roles.yml'),
  users: resolve('./users'),
  users_roles: resolve('./users_roles'),
});
