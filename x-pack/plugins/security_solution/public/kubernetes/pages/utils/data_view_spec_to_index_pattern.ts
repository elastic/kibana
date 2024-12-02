/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-plugin/common';
import type { IndexPattern } from '@kbn/kubernetes-security-plugin/public/types';

export const dataViewSpecToIndexPattern = (
  dataViewSpec?: DataViewSpec
): IndexPattern | undefined => {
  return dataViewSpec as IndexPattern | undefined;
};
