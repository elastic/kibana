/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ServiceLocation } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from './use_selected_monitor';
import { selectSelectedLocationId, setMonitorDetailsLocationAction } from '../../../state';
import { useUrlParams, useLocations } from '../../../hooks';

export const useSelectedLocation = (updateUrl = true) => {
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { locations } = useLocations();
  const { monitor } = useSelectedMonitor();
  const selectedLocationId = useSelector(selectSelectedLocationId);
  const dispatch = useDispatch();

  const { locationId: urlLocationId } = getUrlParams();

  useEffect(() => {
    if (!urlLocationId) {
      const monitorLocationId = monitor?.locations?.[0]?.id;
      if (monitorLocationId && updateUrl) {
        updateUrlParams({ locationId: monitorLocationId }, true);
      }
    }

    if (urlLocationId && selectedLocationId !== urlLocationId) {
      dispatch(setMonitorDetailsLocationAction(urlLocationId));
    }
  }, [
    dispatch,
    updateUrlParams,
    locations,
    urlLocationId,
    selectedLocationId,
    updateUrl,
    monitor?.locations,
  ]);

  return useMemo(() => {
    let selLoc = locations.find((loc) => loc.id === urlLocationId) ?? null;
    if (!selLoc) {
      selLoc =
        (monitor?.locations?.find((loc) => loc.id === urlLocationId) as ServiceLocation) ?? null;
    }
    return selLoc;
  }, [locations, urlLocationId, monitor?.locations]);
};
