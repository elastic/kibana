/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useKibana } from '../../lib/kibana';

export const getUniqueStorageKey = (id: string): string => `kibana.siem:${id}.query.toggle`;

export const useQueryToggle = (
  id: string
): {
  toggleStatus: boolean;
  setToggleStatus: (b: boolean) => void;
} => {
  const {
    services: { storage },
  } = useKibana();
  const storageKey = getUniqueStorageKey(id);
  const [storageValue, setStorageValue] = useState(storage.get(storageKey) ?? true);

  const setToggleStatus = useCallback(
    (isOpen: boolean) => {
      storage.set(storageKey, isOpen);
      setStorageValue(isOpen);
    },
    [storage, storageKey]
  );

  return {
    toggleStatus: storageValue,
    setToggleStatus,
  };
};
