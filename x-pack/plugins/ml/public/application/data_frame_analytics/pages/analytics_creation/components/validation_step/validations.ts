/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VALIDATION_STATUS } from '../../../../../../../common/constants/validation';

export const TRAINING_DOCS_UPPER = 200000;
export const TRAINING_DOCS_LOWER = 200;
export const INCLUDED_FIELDS_THRESHOLD = 100;

export interface CalloutMessage {
  id?: string;
  url?: string;
  text: string;
  status?: VALIDATION_STATUS;
  heading?: string;
}
