/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ArtifactConstants = {
  GLOBAL_ALLOWLIST_NAME: 'endpoint-allowlist',
  SAVED_OBJECT_TYPE: 'securitySolution:endpoint:exceptions-artifact',
  SUPPORTED_OPERATING_SYSTEMS: ['linux', 'windows'],
  SUPPORTED_SCHEMA_VERSIONS: ['1.0.0'],
};

export const ManifestConstants = {
  SAVED_OBJECT_TYPE: 'securitySolution:endpoint:manifest-artifact',
  SCHEMA_VERSION = '1.0.0';
};
