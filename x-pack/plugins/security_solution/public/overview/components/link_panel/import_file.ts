/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart, SavedObjectsImportResponse } from '@kbn/core/public';
import { bulkCreateSavedObjects } from '../../../../common/constants';

interface Options {
  templateName: string;
}

export async function importFile(http: HttpStart, options: Options) {
  const res = await http.post<SavedObjectsImportResponse>(
    bulkCreateSavedObjects(options.templateName)
  );

  return res;
}
