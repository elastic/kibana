/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FunctionComponent, useContext } from 'react';
import { UseMultiFields, FieldHook, FieldConfig } from '../../../../shared_imports';

export interface GlobalFields {
  deleteEnabled: FieldHook<boolean>;
  searchableSnapshotRepo: FieldHook<string>;
}

const GlobalFieldsContext = createContext<GlobalFields | null>(null);

export const GlobalFieldsProvider: FunctionComponent = ({ children }) => {
  const fields: Record<keyof GlobalFields, { path: string; config?: FieldConfig<any> }> = {
    deleteEnabled: {
      path: '_meta.delete.enabled',
    },
    searchableSnapshotRepo: {
      path: '_meta.searchableSnapshot.repository',
    },
  };

  return (
    <UseMultiFields<{
      deleteEnabled: boolean;
      searchableSnapshotRepo: string;
    }>
      fields={fields}
    >
      {(fieldsHooks) => {
        return (
          <GlobalFieldsContext.Provider value={fieldsHooks}>
            {children}
          </GlobalFieldsContext.Provider>
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
