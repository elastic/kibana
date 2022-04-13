/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRepository, getPolicy } from '../../../test/fixtures';

export const REPOSITORY_NAME = 'my-test-repository';

export const REPOSITORY_EDIT = getRepository({ name: REPOSITORY_NAME });

export const POLICY_NAME = 'my-test-policy';

export const SNAPSHOT_NAME = 'my-test-snapshot';

export const POLICY_EDIT = getPolicy({ name: POLICY_NAME, retention: { minCount: 1 } });
