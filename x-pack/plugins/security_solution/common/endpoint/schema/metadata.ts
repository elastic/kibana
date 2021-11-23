/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { HostStatus } from '../types';

export const GetMetadataListRequestSchemaV2 = {
  query: schema.object(
    {
      page: schema.number({ defaultValue: 0, min: 0 }),
      pageSize: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
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
    { defaultValue: { page: 0, pageSize: 10 } }
  ),
};

export type GetMetadataListRequestQuery = TypeOf<typeof GetMetadataListRequestSchemaV2.query>;
