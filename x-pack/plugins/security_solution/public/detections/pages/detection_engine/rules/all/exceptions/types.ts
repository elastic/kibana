/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListInfo } from './use_all_exception_lists';

export interface ExceptionsTableItem extends ExceptionListInfo {
  isDeleting: boolean;
  isExporting: boolean;
}
