/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve, join } from 'path';
import { readFileSync } from 'fs';

const ES_RESOURCES_DIR = resolve(__dirname, 'es_serverless_resources');

export const ES_RESOURCES = Object.freeze({
  roles: join(ES_RESOURCES_DIR, 'roles.yml'),
  users: join(ES_RESOURCES_DIR, 'users'),
  users_roles: join(ES_RESOURCES_DIR, 'users_roles'),
});

export const ES_LOADED_USERS = readFileSync(ES_RESOURCES.users)
  .toString()
  .split(/\n/)
  .filter((v) => !!v) // Ensure no empty strings
  .map((userAndPasswordString) => {
    return userAndPasswordString.split(':').at(0);
  });
