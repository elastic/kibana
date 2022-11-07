/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { UrlStateContainer } from '../../../../utils/url_state';
import { useWaffleTime } from './use_waffle_time';

interface WaffleTimeState {
  currentTime: number;
  isAutoReloading: boolean;
}

export const WithWaffleTimeUrlState = () => {
  const { currentTime, isAutoReloading, setWaffleTimeState } = useWaffleTime();

  const urlState = useMemo(
    () => ({ currentTime, isAutoReloading }),
    [currentTime, isAutoReloading]
  );

  const handleChange = (newUrlState: WaffleTimeState | undefined) => {
    if (newUrlState?.currentTime) {
      setWaffleTimeState({
        currentTime: newUrlState?.currentTime,
        isAutoReloading: newUrlState?.isAutoReloading,
      });
    }
  };

  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="waffleTime"
      mapToUrlState={mapToUrlState}
      onChange={handleChange}
      onInitialize={handleChange}
      populateWithInitialState={true}
    />
  );
};

export const mapToUrlState = (value: any): WaffleTimeState | undefined => {
  if (value?.currentTime) {
    const { currentTime, isAutoReloading } = value;
    return { currentTime, isAutoReloading };
  }
  return undefined;
};
