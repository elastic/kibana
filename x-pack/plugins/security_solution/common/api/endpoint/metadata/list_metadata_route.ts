/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ENDPOINT_DEFAULT_PAGE, ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../endpoint/constants';
import { HostStatus, EndpointSortableField } from '../../../endpoint/types';

export const GetMetadataListRequestSchema = {
  query: schema.object(
    {
      page: schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE, min: 0 }),
      pageSize: schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE_SIZE, min: 1, max: 10000 }),
      kuery: schema.maybe(schema.string()),
      sortField: schema.maybe(
        schema.oneOf([
          schema.literal(EndpointSortableField.ENROLLED_AT.toString()),
          schema.literal(EndpointSortableField.HOSTNAME.toString()),
          schema.literal(EndpointSortableField.HOST_STATUS.toString()),
          schema.literal(EndpointSortableField.POLICY_NAME.toString()),
          schema.literal(EndpointSortableField.POLICY_STATUS.toString()),
          schema.literal(EndpointSortableField.HOST_OS_NAME.toString()),
          schema.literal(EndpointSortableField.HOST_IP.toString()),
          schema.literal(EndpointSortableField.AGENT_VERSION.toString()),
          schema.literal(EndpointSortableField.LAST_SEEN.toString()),
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
