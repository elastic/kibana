/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'fleet.missingEncryptionKeyCalloutHasBeenDismissed';

export const useMissingEncryptionKeyCalloutHasBeenDismissed = (): [
  boolean,
  (val: boolean) => void
] => {
  const [isEncryptionKeyCalloutDismissed, setIsEncryptionKeyCalloutDismissed] = useState(false);

  useEffect(() => {
    const storageValue = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storageValue) {
      setIsEncryptionKeyCalloutDismissed(Boolean(storageValue));
    }
  }, []);

  const updateIsEncryptionKeyCalloutDismissed = (newValue: boolean) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, newValue.toString());
    setIsEncryptionKeyCalloutDismissed(newValue);
  };

  return [isEncryptionKeyCalloutDismissed, updateIsEncryptionKeyCalloutDismissed];
};
