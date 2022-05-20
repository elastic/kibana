/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { ElasticsearchRole } from '../../../../authorization';
import {
  elasticsearchRoleSchema,
  getKibanaRoleSchema,
  transformPrivilegesToElasticsearchPrivileges,
} from '../../../../lib';

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

export function getPutPayloadSchema(
  getBasePrivilegeNames: () => { global: string[]; space: string[] }
) {
  return schema.object({
    /**
     * An optional meta-data dictionary. Within the metadata, keys that begin with _ are reserved
     * for system usage.
     */
    metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),

    /**
     * Elasticsearch specific portion of the role definition.
     */
    elasticsearch: elasticsearchRoleSchema,

    /**
     * Kibana specific portion of the role definition.
     */
    kibana: schema.maybe(getKibanaRoleSchema(getBasePrivilegeNames)),
  });
}

export type RolePayloadSchemaType = TypeOf<ReturnType<typeof getPutPayloadSchema>>;
