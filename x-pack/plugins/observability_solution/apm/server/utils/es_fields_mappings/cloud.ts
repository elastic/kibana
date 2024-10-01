/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUD_ACCOUNT_ID,
  CLOUD_ACCOUNT_NAME,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_IMAGE_ID,
  CLOUD_INSTANCE_ID,
  CLOUD_INSTANCE_NAME,
  CLOUD_MACHINE_TYPE,
  CLOUD_PROJECT_ID,
  CLOUD_PROJECT_NAME,
  CLOUD_PROVIDER,
  CLOUD_REGION,
  CLOUD_SERVICE_NAME,
  type Cloud,
} from '@kbn/apm-types';
import { isOptionalFieldDefined, normalizeValue } from './es_fields_mappings_helpers';
import type { Fields } from './types';

export const cloudMapping = (fields: Fields): { cloud?: Cloud | undefined } | undefined => ({
  ...(isOptionalFieldDefined(fields, 'cloud.')
    ? {
        cloud: {
          availability_zone: normalizeValue<string>(fields[CLOUD_AVAILABILITY_ZONE]),
          instance: {
            name: normalizeValue<string>(fields[CLOUD_INSTANCE_NAME]),
            id: normalizeValue<string>(fields[CLOUD_INSTANCE_ID]),
          },
          machine: {
            type: normalizeValue<string>(fields[CLOUD_MACHINE_TYPE]),
          },
          project: {
            id: normalizeValue<string>(fields[CLOUD_PROJECT_ID]),
            name: normalizeValue<string>(fields[CLOUD_PROJECT_NAME]),
          },
          provider: normalizeValue<string>(fields[CLOUD_PROVIDER]),
          region: normalizeValue<string>(fields[CLOUD_REGION]),
          account: {
            id: normalizeValue<string>(fields[CLOUD_ACCOUNT_ID]),
            name: normalizeValue<string>(fields[CLOUD_ACCOUNT_NAME]),
          },
          image: {
            id: normalizeValue<string>(fields[CLOUD_IMAGE_ID]),
          },
          service: {
            name: normalizeValue<string>(fields[CLOUD_SERVICE_NAME]),
          },
        },
      }
    : undefined),
});
