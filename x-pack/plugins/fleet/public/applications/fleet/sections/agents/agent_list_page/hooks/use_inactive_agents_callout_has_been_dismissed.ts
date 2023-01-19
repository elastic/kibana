/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'fleet_inactiveAgentsCalloutHasBeenDismissed';

export const useInactiveAgentsCalloutHasBeenDismissed = (): [boolean, (val: boolean) => void] => {
  const [inactiveAgentsCalloutHasBeenDismissed, setInactiveAgentsCalloutHasBeenDismissed] =
    useState(false);

  useEffect(() => {
    const storageValue = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storageValue) {
      setInactiveAgentsCalloutHasBeenDismissed(Boolean(storageValue));
    }
  }, []);

  const updateInactiveAgentsCalloutHasBeenDismissed = (newValue: boolean) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, newValue.toString());
    setInactiveAgentsCalloutHasBeenDismissed(newValue);
  };

  return [inactiveAgentsCalloutHasBeenDismissed, updateInactiveAgentsCalloutHasBeenDismissed];
};
