/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FunctionComponent, useContext } from 'react';
import { UseMultiFields, FieldHook, FieldConfig } from '../../../../shared_imports';

/**
 * Those are the fields that we always want present in our form.
 */
interface GlobalFieldsTypes {
  deleteEnabled: boolean;
  searchableSnapshotRepo: string;
}

type GlobalFields = {
  [K in keyof GlobalFieldsTypes]: FieldHook<GlobalFieldsTypes[K]>;
};

const GlobalFieldsContext = createContext<GlobalFields | null>(null);

export const globalFields: Record<
  keyof GlobalFields,
  { path: string; config?: FieldConfig<any> }
> = {
  deleteEnabled: {
    path: '_meta.delete.enabled',
  },
  searchableSnapshotRepo: {
    path: '_meta.searchableSnapshot.repository',
  },
};

export const GlobalFieldsProvider: FunctionComponent = ({ children }) => {
  return (
    <UseMultiFields<GlobalFieldsTypes> fields={globalFields}>
      {(fields) => {
        return (
          <GlobalFieldsContext.Provider value={fields}>{children}</GlobalFieldsContext.Provider>
        );
      }}
    </UseMultiFields>
  );
};

export const useGlobalFields = () => {
  const ctx = useContext(GlobalFieldsContext);
  if (!ctx) throw new Error('Cannot use global fields outside of global fields context');

  return ctx;
};
