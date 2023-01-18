/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'fleet_lastSeenInactiveAgentsCount';

export const useLastSeenInactiveAgentsCount = (): [number, (val: number) => void] => {
  const [lastSeenInactiveAgentsCount, setLastSeenInactiveAgentsCount] = useState(0);

  useEffect(() => {
    const storageValue = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storageValue) {
      setLastSeenInactiveAgentsCount(parseInt(storageValue, 10));
    }
  }, []);

  const updateLastSeenInactiveAgentsCount = (inactiveAgents: number) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, inactiveAgents.toString());
    setLastSeenInactiveAgentsCount(inactiveAgents);
  };

  return [lastSeenInactiveAgentsCount, updateLastSeenInactiveAgentsCount];
};
