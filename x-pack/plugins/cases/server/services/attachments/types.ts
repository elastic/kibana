/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommentTypeStats } from '../../../common/api';

/**
 * The totals per attachment type
 */
export interface CaseCommentStats {
  id: string;
  totals: CommentTypeStats;
}
