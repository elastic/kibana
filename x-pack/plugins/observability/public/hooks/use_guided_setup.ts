/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';

export const LOCAL_STORAGE_HIDE_GUIDED_SETUP_KEY = 'HIDE_GUIDED_SETUP';

export function useGuidedSetup() {
  const hideGuidedSetupLocalStorageKey = window.localStorage.getItem(
    LOCAL_STORAGE_HIDE_GUIDED_SETUP_KEY
  );
  const [isGuidedSetupHidden, setIsGuidedSetupHidden] = useState<boolean>(
    JSON.parse(hideGuidedSetupLocalStorageKey || 'false')
  );

  const hideGuidedSetup = useCallback(() => {
    window.localStorage.setItem(LOCAL_STORAGE_HIDE_GUIDED_SETUP_KEY, 'true');
    setIsGuidedSetupHidden(true);
  }, []);

  return {
    isGuidedSetupHidden,
    hideGuidedSetup,
  };
}
