/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiAutoRefreshButton, OnRefreshChangeProps } from '@elastic/eui';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../../../common/constants/synthetics/client_defaults';
const { AUTOREFRESH_INTERVAL_SECONDS, AUTOREFRESH_IS_PAUSED } = CLIENT_DEFAULTS_SYNTHETICS;

export const AutoRefreshButton = () => {
  const [refreshInterval, setRefreshInterval] = useLocalStorage<number>(
    'xpack.synthetics.refreshInterval',
    AUTOREFRESH_INTERVAL_SECONDS
  );
  const [refreshPaused, setRefreshPaused] = useLocalStorage<boolean>(
    'xpack.synthetics.refreshPaused',
    AUTOREFRESH_IS_PAUSED
  );

  const onRefreshChange = (newProps: OnRefreshChangeProps) => {
    setRefreshPaused(newProps.isPaused);
    setRefreshInterval(newProps.refreshInterval / 1000);
  };

  return (
    <EuiAutoRefreshButton
      size="m"
      isPaused={refreshPaused}
      refreshInterval={(refreshInterval || AUTOREFRESH_INTERVAL_SECONDS) * 1000}
      onRefreshChange={onRefreshChange}
      shortHand
    />
  );
};
