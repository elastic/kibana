/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MonitorOverviewItem } from '../../../../common/runtime_types';
import { getServiceLocations, selectServiceLocationsState } from '../state';

export function useLocationName(monitor: MonitorOverviewItem) {
  const dispatch = useDispatch();
  const { locationsLoaded, locations } = useSelector(selectServiceLocationsState);
  useEffect(() => {
    if (!locationsLoaded) {
      dispatch(getServiceLocations());
    }
  });
  const locationId = monitor?.location.id;

  return useMemo(() => {
    if (!locationsLoaded || monitor.location.label) {
      return monitor.location.label ?? monitor.location.id;
    } else {
      const location = locations.find((loc) => loc.id === locationId);
      return location?.label ?? (monitor.location.label || monitor.location.id);
    }
  }, [locationsLoaded, locations, locationId, monitor]);
}
