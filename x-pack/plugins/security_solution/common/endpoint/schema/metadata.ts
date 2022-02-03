/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ENDPOINT_DEFAULT_PAGE, ENDPOINT_DEFAULT_PAGE_SIZE } from '../constants';
import { HostStatus } from '../types';

export const GetMetadataListRequestSchema = {
  query: schema.object(
    {
      page: schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE, min: 0 }),
      pageSize: schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE_SIZE, min: 1, max: 10000 }),
      kuery: schema.maybe(schema.string()),
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
