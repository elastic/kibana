/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useContext, useState, type ReactChild } from 'react';
import { Subject } from 'rxjs';
import { DataView } from '@kbn/data-views-plugin/common';
import { useAdHocInventoryDataView } from '../../hooks/use_adhoc_inventory_data_view';

interface InventorySearchBarContextType {
  refreshSubject$: Subject<void>;
  isControlPanelsInitiated: boolean;
  setIsControlPanelsInitiated: React.Dispatch<React.SetStateAction<boolean>>;
  dataView?: DataView;
}

const InventorySearchBarContext = createContext<InventorySearchBarContextType>({
  refreshSubject$: new Subject(),
  isControlPanelsInitiated: false,
  setIsControlPanelsInitiated: () => {},
});

export function InventorySearchBarContextProvider({ children }: { children: ReactChild }) {
  const [isControlPanelsInitiated, setIsControlPanelsInitiated] = useState(false);
  const { dataView } = useAdHocInventoryDataView();
  const [refreshSubject$] = useState<Subject<void>>(new Subject());

  return (
    <InventorySearchBarContext.Provider
      value={{
        refreshSubject$,
        isControlPanelsInitiated,
        setIsControlPanelsInitiated,
        dataView,
      }}
    >
      {children}
    </InventorySearchBarContext.Provider>
  );
}

export function useInventorySearchBarContext() {
  const context = useContext(InventorySearchBarContext);
  if (!context) {
    throw new Error('Context was not found');
  }
  return context;
}
