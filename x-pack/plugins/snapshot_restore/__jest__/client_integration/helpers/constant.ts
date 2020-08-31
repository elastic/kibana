/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRepository, getPolicy } from '../../../test/fixtures';

export const REPOSITORY_NAME = 'my-test-repository';

export const REPOSITORY_EDIT = getRepository({ name: REPOSITORY_NAME });

export const POLICY_NAME = 'my-test-policy';

export const POLICY_EDIT = getPolicy({ name: POLICY_NAME, retention: { minCount: 1 } });
