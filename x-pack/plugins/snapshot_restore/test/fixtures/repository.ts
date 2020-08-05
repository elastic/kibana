/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRandomString } from '../../../../test_utils';
import { RepositoryType } from '../../common/types';
const defaultSettings: any = { chunkSize: '10mb', location: '/tmp/es-backups' };

interface Repository {
  name: string;
  type: RepositoryType;
  settings: any;
}

export const getRepository = ({
  name = getRandomString(),
  type = 'fs' as 'fs',
  settings = defaultSettings,
}: Partial<Repository> = {}): Repository => ({
  name,
  type,
  settings,
});
