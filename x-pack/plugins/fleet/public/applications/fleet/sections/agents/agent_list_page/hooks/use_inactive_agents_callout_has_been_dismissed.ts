/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import type { TOUR_STORAGE_CONFIG } from '../../../../../../constants';
import { TOUR_STORAGE_KEYS } from '../../../../../../constants';
import { useStartServices } from '../../../../../../hooks';

export const useInactiveAgentsCalloutHasBeenDismissed = (): [boolean, (val: boolean) => void] => {
  const { uiSettings, storage } = useStartServices();

  const [inactiveAgentsCalloutHasBeenDismissed, setInactiveAgentsCalloutHasBeenDismissed] =
    useState(false);

  useEffect(() => {
    setInactiveAgentsCalloutHasBeenDismissed(
      uiSettings.get('hideAnnouncements', false) ||
        (
          storage.get(TOUR_STORAGE_KEYS.INACTIVE_AGENTS) as
            | TOUR_STORAGE_CONFIG['INACTIVE_AGENTS']
            | undefined
        )?.active === false
    );
  }, [storage, uiSettings]);

  const updateInactiveAgentsCalloutHasBeenDismissed = (newValue: boolean) => {
    storage.set(TOUR_STORAGE_KEYS.INACTIVE_AGENTS, {
      active: false,
    } as TOUR_STORAGE_CONFIG['INACTIVE_AGENTS']);
    setInactiveAgentsCalloutHasBeenDismissed(newValue);
  };

  return [inactiveAgentsCalloutHasBeenDismissed, updateInactiveAgentsCalloutHasBeenDismissed];
};
