/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePoint } from '@kbn/ml-agg-utils';

// To optimize the `frequent_items` query, we identify duplicate change points by count attributes.
// Note this is a compromise and not 100% accurate because there could be change points that
// have the exact same counts but still don't co-occur.
export const duplicateIdentifier: Array<keyof ChangePoint> = [
  'doc_count',
  'bg_count',
  'total_doc_count',
  'total_bg_count',
];
