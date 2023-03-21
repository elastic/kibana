/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useMemo } from 'react';
import { useSourcererDataView } from '../modules/indicators';

export type FieldTypesContextValue = Record<string, string | undefined>;

export const FieldTypesContext = createContext<FieldTypesContextValue | undefined>({});

/**
 * Exposes mapped field types for threat intel shared use
 */
export const FieldTypesProvider: FC = ({ children }) => {
  const { indexPattern } = useSourcererDataView();

  // field name to field type map to allow the cell_renderer to format dates
  const fieldTypes: FieldTypesContextValue = useMemo(
    () =>
      indexPattern.fields.reduce((acc, field) => {
        acc[field.name] = field.type;
        return acc;
      }, {} as FieldTypesContextValue),
    [indexPattern.fields]
  );

  return <FieldTypesContext.Provider value={fieldTypes}>{children}</FieldTypesContext.Provider>;
};
