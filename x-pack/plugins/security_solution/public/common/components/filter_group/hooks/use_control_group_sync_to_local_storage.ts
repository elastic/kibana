/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getFilterItemObjListFromControlInput } from '../utils';
import type { FilterItemObj } from '../types';

interface UseControlGroupSyncToLocalStorageArgs {
  storageKey: string;
  onSync?: (filterControls: FilterItemObj[]) => void;
  shouldSync: boolean;
}

type UseControlGroupSyncToLocalStorage = (args: UseControlGroupSyncToLocalStorageArgs) => {
  controlGroupInput: ControlGroupInput | undefined;
  setControlGroupInput: Dispatch<SetStateAction<ControlGroupInput>>;
  getStoredControlGroupInput: () => ControlGroupInput | undefined;
};

export const useControlGroupSyncToLocalStorage: UseControlGroupSyncToLocalStorage = ({
  storageKey,
  shouldSync,
  onSync,
}) => {
  const storage = useRef<Storage>(new Storage(localStorage));

  const [controlGroupInput, setControlGroupInput] = useState(
    () => (storage.current.get(storageKey) as ControlGroupInput) ?? undefined
  );

  useEffect(() => {
    if (shouldSync && controlGroupInput) {
      // storage.current.set(storageKey, controlGroupInput);
      const filterItemObj = getFilterItemObjListFromControlInput(controlGroupInput);
      onSync?.(filterItemObj);
    }
  }, [shouldSync, controlGroupInput, storageKey, onSync]);

  const getStoredControlGroupInput = () => {
    return (storage.current.get(storageKey) as ControlGroupInput) ?? undefined;
  };

  return {
    controlGroupInput,
    setControlGroupInput,
    getStoredControlGroupInput,
  };
};
