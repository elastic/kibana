/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAutoRefreshButton, OnRefreshChangeProps } from '@elastic/eui';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';

export const AutoRefreshButton = () => {
  const { refreshInterval, setRefreshInterval, refreshPaused, setRefreshPaused } =
    useSyntheticsRefreshContext();

  const onRefreshChange = (newProps: OnRefreshChangeProps) => {
    setRefreshPaused(newProps.isPaused);
    setRefreshInterval(newProps.refreshInterval / 1000);
  };

  return (
    <EuiAutoRefreshButton
      size="m"
      isPaused={refreshPaused}
      refreshInterval={refreshInterval * 1000}
      onRefreshChange={onRefreshChange}
      shortHand
    />
  );
};
