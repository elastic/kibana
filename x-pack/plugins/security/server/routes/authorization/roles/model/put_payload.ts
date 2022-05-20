/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRole } from '.';
import type { RolePayloadSchemaType } from '../../../../lib/role_schema';
import { transformPrivilegesToElasticsearchPrivileges } from '../../../../lib/role_utils';

export const transformPutPayloadToElasticsearchRole = (
  rolePayload: RolePayloadSchemaType,
  application: string,
  allExistingApplications: ElasticsearchRole['applications'] = []
) => {
  const {
    elasticsearch = { cluster: undefined, indices: undefined, run_as: undefined },
    kibana = [],
  } = rolePayload;
  const otherApplications = allExistingApplications.filter(
    (roleApplication) => roleApplication.application !== application
  );

  return {
    metadata: rolePayload.metadata,
    cluster: elasticsearch.cluster || [],
    indices: elasticsearch.indices || [],
    run_as: elasticsearch.run_as || [],
    applications: [
      ...transformPrivilegesToElasticsearchPrivileges(application, kibana),
      ...otherApplications,
    ],
  } as Omit<ElasticsearchRole, 'name'>;
};
