/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space } from './space';

export type GetAllSpacesPurpose =
  | 'any'
  | 'copySavedObjectsIntoSpace'
  | 'findSavedObjects'
  | 'shareSavedObjectsIntoSpace';

export interface GetSpaceResult extends Space {
  authorizedPurposes?: Record<GetAllSpacesPurpose, boolean>;
}
