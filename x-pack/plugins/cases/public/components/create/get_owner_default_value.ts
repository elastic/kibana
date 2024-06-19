/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GENERAL_CASES_OWNER } from '../../../common';

export const getOwnerDefaultValue = (availableOwners: string[]) =>
  availableOwners.includes(GENERAL_CASES_OWNER)
    ? GENERAL_CASES_OWNER
    : availableOwners[0] ?? GENERAL_CASES_OWNER;
