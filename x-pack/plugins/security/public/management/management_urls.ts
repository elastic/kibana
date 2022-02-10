/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EDIT_ROLE_MAPPING_PATH = `/edit`;

export const getEditRoleMappingHref = (roleMappingName: string) =>
  `${EDIT_ROLE_MAPPING_PATH}/${encodeURIComponent(roleMappingName)}`;

export const CLONE_ROLE_MAPPING_PATH = `/clone`;

export const getCloneRoleMappingHref = (roleMappingName: string) =>
  `${CLONE_ROLE_MAPPING_PATH}/${encodeURIComponent(roleMappingName)}`;
