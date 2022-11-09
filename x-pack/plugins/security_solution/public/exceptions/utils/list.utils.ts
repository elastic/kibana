/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listIDsCannotBeEdited } from '../config';
import type { ExceptionListInfo } from '../hooks/use_all_exception_lists';

export const checkIfListCannotBeEdited = (list: ExceptionListInfo) => {
  return !!listIDsCannotBeEdited.find((id) => id === list.list_id);
};
