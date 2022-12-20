/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { SourcererDataView } from '../../../common/store/sourcerer/model';

export const useIsFieldInIndexPattern = (indexPatterns: SourcererDataView[]) => {
  const isFieldInIndexPattern = useCallback(() => {}, []);
  return isFieldInIndexPattern;
};
