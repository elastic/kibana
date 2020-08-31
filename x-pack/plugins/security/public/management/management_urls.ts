/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const EDIT_ROLE_MAPPING_PATH = `/edit`;

export const getEditRoleMappingHref = (roleMappingName: string) =>
  `${EDIT_ROLE_MAPPING_PATH}/${encodeURIComponent(roleMappingName)}`;
