/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from './use_local_storage';

type TourState = 'isModalVisible' | 'isTourActive';

const INITIAL_STATE: Record<TourState, boolean | undefined> = {
  isModalVisible: undefined,
  isTourActive: true,
};

export function useServiceEcoTour() {
  const [tourState, setTourState] = useLocalStorage('apm.serviceEcoTour', INITIAL_STATE);

  return {
    tourState,
    hideModal: () => setTourState({ ...tourState, isModalVisible: false }),
    showModal: () => setTourState({ ...tourState, isModalVisible: true }),
    hideTour: () => setTourState({ ...tourState, isTourActive: false }),
  };
}
