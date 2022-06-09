/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart, SavedObjectsImportResponse } from 'src/core/public';
import { CREATE_DASHBOARD_ROUTE } from '../../../../common/constants';

export async function importFile(http: HttpStart) {
  const res = await http.post<SavedObjectsImportResponse>(CREATE_DASHBOARD_ROUTE);

  return res;
}
