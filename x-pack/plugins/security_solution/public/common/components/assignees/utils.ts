/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_ASSIGNEES_VALUE } from './constants';
import type { AssigneesIdsSelection } from './types';

export const removeNoAssigneesSelection = (assignees: AssigneesIdsSelection[]): string[] =>
  assignees.filter<string>((assignee): assignee is string => assignee !== NO_ASSIGNEES_VALUE);
