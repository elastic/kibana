/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface User {
  email: undefined | null | string;
  full_name: undefined | null | string;
  username: undefined | null | string;
  profile_uid?: string;
}
