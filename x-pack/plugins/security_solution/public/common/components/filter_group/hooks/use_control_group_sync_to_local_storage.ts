/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { isEqual } from 'lodash';

interface UseControlGroupSyncToLocalStorageArgs {
  storageKey: string;
  shouldSync: boolean;
  saveHandler?: (controlGroupInput: ControlGroupInput) => void;
}

type UseControlGroupSyncToLocalStorage = (args: UseControlGroupSyncToLocalStorageArgs) => {
  controlGroupInput: ControlGroupInput | undefined;
  setControlGroupInput: Dispatch<SetStateAction<ControlGroupInput>>;
  getStoredControlGroupInput: () => ControlGroupInput | undefined;
};

export const useControlGroupSyncToLocalStorage: UseControlGroupSyncToLocalStorage = ({
  storageKey,
  shouldSync,
  saveHandler,
}) => {
  const storage = useRef<Storage>(new Storage(localStorage));
  const storageKeyRef = useRef(storageKey);

  const [controlGroupInput, setControlGroupInput] = useState(
    () => (storage.current.get(storageKey) as ControlGroupInput) ?? undefined
  ); // related to old storage key

  const getStoredControlGroupInput = useCallback(() => {
    const val = (storage.current.get(storageKey) as ControlGroupInput) ?? undefined;
    return val;
  }, [storageKey]);

  useEffect(() => {
    if (
      shouldSync &&
      controlGroupInput &&
      !isEqual(controlGroupInput, getStoredControlGroupInput())
    ) {
      if (storageKeyRef.current !== storageKey) {
        storageKeyRef.current = storageKey;
        return;
      }

      if (saveHandler) saveHandler(controlGroupInput);
      storage.current.set(storageKey, controlGroupInput);
      storageKeyRef.current = storageKey;
    }
  }, [shouldSync, controlGroupInput, storageKey, saveHandler, getStoredControlGroupInput]);

  return {
    controlGroupInput,
    setControlGroupInput,
    getStoredControlGroupInput,
  };
};
