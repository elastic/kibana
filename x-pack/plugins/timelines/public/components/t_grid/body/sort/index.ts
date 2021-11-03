/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortDirection } from '../../../../../common/types/timeline';
import type { SortColumnTimeline } from '../../../../../common/types/timeline';

// TODO: Cleanup this type to match SortColumnTimeline
export type { SortDirection };

/** Specifies which column the timeline is sorted on */
export type Sort = SortColumnTimeline;
