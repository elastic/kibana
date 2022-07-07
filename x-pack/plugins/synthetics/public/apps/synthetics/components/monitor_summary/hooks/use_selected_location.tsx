/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSelectedLocationId, setMonitorSummaryLocationAction } from '../../../state';
import { useUrlParams, useLocations } from '../../../hooks';

export const useSelectedLocation = () => {
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { locations } = useLocations();
  const selectedLocation = useSelector(selectSelectedLocationId);
  const dispatch = useDispatch();

  const { locationId: urlLocationId } = getUrlParams();

  useEffect(() => {
    if (!urlLocationId) {
      const firstLocationId = locations?.[0]?.id;
      if (firstLocationId) {
        updateUrlParams({ locationId: firstLocationId });
      }
    }

    if (urlLocationId && selectedLocation !== urlLocationId) {
      dispatch(setMonitorSummaryLocationAction(urlLocationId));
    }
  }, [dispatch, updateUrlParams, locations, urlLocationId, selectedLocation]);

  return useMemo(
    () => locations.find((loc) => loc.id === urlLocationId) ?? null,
    [urlLocationId, locations]
  );
};
