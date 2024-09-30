/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

export const MINIMUM_INDEX_PRIVILEGE_SET_EDITOR = [
  'write',
  'read',
  'view_index_metadata',
  'manage',
];
export const TOTAL_INDEX_PRIVILEGE_SET_EDITOR = [
  'write',
  'read',
  'read_cross_cluster',
  'view_index_metadata',
  'manage',
];
export const MINIMUM_INDEX_PRIVILEGE_SET_VIEWER = ['read'];
export const TOTAL_INDEX_PRIVILEGE_SET_VIEWER = ['read', 'read_cross_cluster'];

export async function getGlobalDiagnosis(
  esClient: ElasticsearchClient,
  licensing: LicensingApiRequestHandlerContext
) {
  const licenseInfo = licensing.license.toJSON();
  const userWritePrivileges = await esClient.security.hasPrivileges({
    index: [
      {
        names: '.slo-observability.*',
        privileges: MINIMUM_INDEX_PRIVILEGE_SET_EDITOR,
      },
    ],
  });
  const userReadPrivileges = await esClient.security.hasPrivileges({
    index: [{ names: '.slo-observability.*', privileges: MINIMUM_INDEX_PRIVILEGE_SET_VIEWER }],
  });

  return {
    licenseAndFeatures: licenseInfo,
    userPrivileges: { write: userWritePrivileges, read: userReadPrivileges },
  };
}
