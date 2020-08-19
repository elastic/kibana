/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { GetTrustedAppsRequestSchema } from '../schema/trusted_apps';

/** API request params for retrieving a list of Trusted Apps */
export type GetTrustedAppsRequest = TypeOf<typeof GetTrustedAppsRequestSchema.query>;
