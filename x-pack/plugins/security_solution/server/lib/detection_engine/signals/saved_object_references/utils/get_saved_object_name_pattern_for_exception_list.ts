/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './constants';
import { getSavedObjectNamePattern } from './get_saved_object_name_pattern';

export const getSavedObjectNamePatternForExceptionsList = (index: number): string =>
  getSavedObjectNamePattern(EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME, index);
