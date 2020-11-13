/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobParamsPanelCsv } from '../../export_types/csv_from_savedobject/types';
import { CsvFromSavedObjectRequest } from '../generate_from_savedobject_immediate';

export function getJobParamsFromRequest(request: CsvFromSavedObjectRequest): JobParamsPanelCsv {
  const { savedObjectType, savedObjectId } = request.params;
  const { timerange, state } = request.body;

  const post = timerange || state ? { timerange, state } : undefined;

  return {
    savedObjectType,
    savedObjectId,
    post,
  };
}
