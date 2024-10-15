/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '../../../security/common/model';
import { DEFAULT_SIGNALS_INDEX } from '../../common/constants';

const READ_PRIVILEGES = ['all', 'read'];

export const roleHasReadAccess = (role: Role, indexPrefix = DEFAULT_SIGNALS_INDEX): boolean =>
  role.elasticsearch.indices.some(
    (index) =>
      index.names.some((indexName) => indexName.startsWith(indexPrefix)) &&
      index.privileges.some((indexPrivilege) => READ_PRIVILEGES.includes(indexPrivilege))
  );

export const roleIsExternal = (role: Role): boolean => role.metadata?._reserved !== true;
