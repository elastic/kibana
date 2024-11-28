/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLSingleAstItem } from '@kbn/esql-ast';

/**
 * Represents a correction that can be applied to a query
 */
export interface QueryCorrection {
  type: string;
  description: string;
  node: ESQLSingleAstItem;
  apply: () => void;
}
