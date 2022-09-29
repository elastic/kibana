/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SearchHit } from '../../../../../common/search_strategy';

export const useGetFieldsData = (
  fieldsData: SearchHit['fields'] | undefined
): ((field: string) => string | undefined) => {
  const cachedFieldsData = useMemo(() => fieldsData, [fieldsData]);

  return (field: string) => {
    const fieldValue = cachedFieldsData ? cachedFieldsData[field] : undefined;
    if (Array.isArray(fieldValue)) {
      if (fieldValue.length === 0) return null;
      if (fieldValue.length === 1) return fieldValue[0];
      if (fieldValue.length > 1) return fieldValue;
    }
    return fieldValue;
  };
};
