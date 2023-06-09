/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourcererScopeName } from '../store/sourcerer/model';
import { getSelectedDataviewSelector } from '../store/sourcerer/selectors';
import { useDeepEqualSelector } from './use_selector';

const selectedDataviewSelector = getSelectedDataviewSelector();

export const useGetFieldSpec = (scopeId: SourcererScopeName) => {
  const dataView = useDeepEqualSelector((state) => selectedDataviewSelector(state, scopeId));
  return (fieldName: string) => {
    const fields = dataView?.fields;
    return fields && fields[fieldName];
  };
};
