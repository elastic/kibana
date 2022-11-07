/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OWNER_INFO } from '../constants';

export const isValidOwner = (owner: string): owner is keyof typeof OWNER_INFO =>
  Object.keys(OWNER_INFO).includes(owner);
