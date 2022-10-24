/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListInfo } from '../../../rule_exceptions_ui/pages/exceptions/use_all_exception_lists';

export type { ExceptionListInfo as ExceptionListWithRules };

export interface ExceptionListDetailsComponentProps {
  isReadOnly: boolean;
  list: ExceptionListInfo;
}
