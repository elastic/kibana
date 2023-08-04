/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ENDPOINT_DEFAULT_PAGE, ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../endpoint/constants';
import { HostStatus } from '../../../endpoint/types';

export const GetMetadataListRequestSchema = {
  query: schema.object(
    {
      page: schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE, min: 0 }),
      pageSize: schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE_SIZE, min: 1, max: 10000 }),
      kuery: schema.maybe(schema.string()),
      sortField: schema.maybe(
        schema.oneOf([
          // allowed fields for sorting - these are the column fields in the EndpointList table, based on the
          // returned `HostInfoInterface` data type, and not on the internal data structure
          schema.literal('metadata.host.hostname'),
          schema.literal('host_status'),
          schema.literal('metadata.Endpoint.policy.applied.name'),
          schema.literal('metadata.Endpoint.policy.applied.status'),
          schema.literal('metadata.host.os.name'),
          schema.literal('metadata.host.ip'),
          schema.literal('metadata.agent.version'),
          schema.literal('metadata.@timestamp'),
        ])
      ),
      sortDirection: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
      hostStatuses: schema.maybe(
        schema.arrayOf(
          schema.oneOf([
            schema.literal(HostStatus.HEALTHY.toString()),
            schema.literal(HostStatus.OFFLINE.toString()),
            schema.literal(HostStatus.UPDATING.toString()),
            schema.literal(HostStatus.UNHEALTHY.toString()),
            schema.literal(HostStatus.INACTIVE.toString()),
          ])
        )
      ),
    },
    { defaultValue: { page: ENDPOINT_DEFAULT_PAGE, pageSize: ENDPOINT_DEFAULT_PAGE_SIZE } }
  ),
};

export type GetMetadataListRequestQuery = TypeOf<typeof GetMetadataListRequestSchema.query>;
