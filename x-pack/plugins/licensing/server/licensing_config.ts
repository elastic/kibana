/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

const SECOND = 1000;
export const config = {
  schema: schema.object({
    pollingFrequency: schema.number({ defaultValue: 30 * SECOND }),
  }),
};

export type LicenseConfigType = TypeOf<typeof config.schema>;
