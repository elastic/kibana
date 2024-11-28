/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLSingleAstItem } from '@kbn/esql-ast';

/**
 * Represents a correction that was applied to the query
 */
export interface QueryCorrection {
  /** The type of correction */
  type: string;
  /** A human-friendly-ish description of the correction */
  description: string;
  /** The parent node the correction was applied to */
  node: ESQLSingleAstItem;
}
