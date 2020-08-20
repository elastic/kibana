/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { GetTrustedAppsRequestSchema } from '../schema/trusted_apps';
import { ExceptionListItemSchema } from '../../../../lists/common';
import { FoundExceptionListItemSchema } from '../../../../lists/common/schemas/response';

/** API request params for retrieving a list of Trusted Apps */
export type GetTrustedAppsListRequest = TypeOf<typeof GetTrustedAppsRequestSchema.query>;
export type GetTrustedListAppsResponse = Pick<
  FoundExceptionListItemSchema,
  'per_page' | 'page' | 'total'
> & {
  data: TrustedApp[];
};

/** Type for a new Trusted App Entry */
export type NewTrustedApp = Pick<ExceptionListItemSchema, 'name' | 'description' | 'entries'> & {
  os: string;
};

/** A trusted app entry */
export type TrustedApp = NewTrustedApp &
  Pick<ExceptionListItemSchema, 'created_at' | 'created_by'> & {
    id: string;
  };
