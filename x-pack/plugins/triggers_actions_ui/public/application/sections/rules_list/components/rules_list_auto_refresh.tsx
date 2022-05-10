/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiAutoRefreshButton } from '@elastic/eui';

interface RulesListAutoRefreshProps {
  lastUpdate: string;
  onRefresh: () => void;
}

export const RulesListAutoRefresh = (props: RulesListAutoRefreshProps) => {
  const { lastUpdate, onRefresh } = props;

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(5 * 60 * 1000);
  const cachedOnRefresh = useRef<() => void>(() => {});
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    cachedOnRefresh.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const poll = () => {
      timeout.current = window.setTimeout(() => {
        cachedOnRefresh.current();
        poll();
      }, refreshInterval);
    };

    poll();

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, [isPaused, refreshInterval]);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
        <EuiText size="s" color="subdued">
          {lastUpdate && `Updated ${moment(lastUpdate).fromNow()}`}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAutoRefreshButton
          isPaused={isPaused}
          shortHand
          refreshInterval={refreshInterval}
          onRefreshChange={({ isPaused: newIsPaused, refreshInterval: newRefreshInterval }) => {
            setIsPaused(newIsPaused);
            setRefreshInterval(newRefreshInterval);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
