/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTAINER_ID, CONTAINER_IMAGE, type Container } from '@kbn/apm-types';
import { isOptionalFieldDefined, normalizeValue } from './es_fields_mappings_helpers';
import type { Fields } from './types';

export const containerMapping = (
  fields: Fields
): { container?: Container | undefined } | undefined => ({
  ...(isOptionalFieldDefined(fields, 'container.')
    ? {
        container: {
          id: normalizeValue<string>(fields[CONTAINER_ID]),
          image: normalizeValue<string>(fields[CONTAINER_IMAGE]),
        },
      }
    : undefined),
});
