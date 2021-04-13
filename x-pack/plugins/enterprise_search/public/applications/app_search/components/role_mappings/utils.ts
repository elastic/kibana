/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLE_MAPPING_PATH } from '../../routes';
import { generateEncodedPath } from '../../utils/encode_path_params';

export const generateRoleMappingPath = (roleId: string) =>
  generateEncodedPath(ROLE_MAPPING_PATH, { roleId });
