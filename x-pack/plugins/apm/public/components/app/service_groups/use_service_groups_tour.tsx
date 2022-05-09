/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from '../../../hooks/use_local_storage';
import { TourType } from './service_groups_tour';

const INITIAL_STATE: Record<TourType, boolean> = {
  createGroup: true,
  editGroup: true,
  serviceGroupCard: true,
};

export function useServiceGroupsTour(type: TourType) {
  const [tourEnabled, setTourEnabled] = useLocalStorage(
    'apm.serviceGroupsTour',
    INITIAL_STATE
  );

  return {
    tourEnabled: tourEnabled[type],
    dismissTour: () =>
      setTourEnabled({
        ...tourEnabled,
        [type]: false,
      }),
  };
}
