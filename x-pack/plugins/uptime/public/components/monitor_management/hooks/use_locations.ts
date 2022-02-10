/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getServiceLocations } from '../../../state/actions';
import { monitorManagementListSelector } from '../../../state/selectors';

export function useLocations() {
  const dispatch = useDispatch();
  const {
    error: { serviceLocations: serviceLocationsError },
    loading: { serviceLocations: serviceLocationsLoading },
    locations,
  } = useSelector(monitorManagementListSelector);

  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);

  return {
    locations,
    error: serviceLocationsError,
    loading: serviceLocationsLoading,
  };
}
