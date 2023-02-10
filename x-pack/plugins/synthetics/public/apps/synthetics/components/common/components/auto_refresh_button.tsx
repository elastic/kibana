/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAutoRefreshButton, OnRefreshChangeProps } from '@elastic/eui';
import { useSyntheticsRefreshContext } from '../../../contexts';

export const AutoRefreshButton = () => {
  const { refreshInterval, setRefreshInterval, refreshPaused, setRefreshPaused } =
    useSyntheticsRefreshContext();

  const onRefreshChange = (newProps: OnRefreshChangeProps) => {
    setRefreshInterval(newProps.refreshInterval);
    setRefreshPaused(newProps.isPaused);
  };

  return (
    <EuiAutoRefreshButton
      size="m"
      isPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onRefreshChange={onRefreshChange}
      shortHand
    />
  );
};
