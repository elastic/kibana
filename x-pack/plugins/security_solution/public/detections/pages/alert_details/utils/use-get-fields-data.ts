/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

export const useGetFieldsData = (
  fieldsData: Record<string, string[]> | null
): ((field: string) => string | undefined) => {
  const cachedFieldsData = useMemo(() => fieldsData, [fieldsData]);

  return (field: string) => {
    const fieldArray = cachedFieldsData ? cachedFieldsData[field] : undefined;
    return fieldArray ? fieldArray[0] : undefined;
  };
};
