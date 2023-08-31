/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

export async function getGlobalDiagnosis(
  esClient: ElasticsearchClient,
  licensing: LicensingApiRequestHandlerContext
) {
  const licenseInfo = licensing.license.toJSON();
  const userWritePrivileges = await esClient.security.hasPrivileges({
    cluster: ['manage_transform'],
    index: [{ names: '.slo-*', privileges: ['all'] }],
  });
  const userReadPrivileges = await esClient.security.hasPrivileges({
    index: [{ names: '.slo-*', privileges: ['read'] }],
  });

  return {
    licenseAndFeatures: licenseInfo,
    userPrivileges: { write: userWritePrivileges, read: userReadPrivileges },
  };
}
