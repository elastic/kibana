/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectServiceLocationsState, getServiceLocations } from '../state';

export function useLocationNames() {
  const dispatch = useDispatch();
  const { locationsLoaded, locations } = useSelector(selectServiceLocationsState);
  useEffect(() => {
    if (!locationsLoaded) {
      dispatch(getServiceLocations());
    }
  });

  return useMemo(
    () =>
      locations.reduce<Record<string, string>>((acc, location) => {
        acc[location.id] = location.label;
        return acc;
      }, {}),
    [locations]
  );
}
