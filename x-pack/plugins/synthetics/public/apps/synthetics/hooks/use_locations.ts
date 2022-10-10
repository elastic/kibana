/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getServiceLocations, selectServiceLocationsState } from '../state';

export function useLocations() {
  const dispatch = useDispatch();
  const { error, loading, locations, throttling, locationsLoaded } = useSelector(
    selectServiceLocationsState
  );

  useEffect(() => {
    if (!locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locations, locationsLoaded]);

  return {
    error,
    loading,
    locations,
    throttling,
  };
}
