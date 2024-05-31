/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiAutoRefreshButton, OnRefreshChangeProps } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../../../common/constants/synthetics/client_defaults';
import { SyntheticsUrlParams } from '../../../utils/url_params';
import { useUrlParams } from '../../../hooks';
import {
  selectRefreshInterval,
  selectRefreshPaused,
  setRefreshIntervalAction,
  setRefreshPausedAction,
} from '../../../state';
const { AUTOREFRESH_INTERVAL_SECONDS, AUTOREFRESH_IS_PAUSED } = CLIENT_DEFAULTS_SYNTHETICS;

const replaceDefaults = ({ refreshPaused, refreshInterval }: Partial<SyntheticsUrlParams>) => {
  return {
    refreshInterval: refreshInterval === AUTOREFRESH_INTERVAL_SECONDS ? undefined : refreshInterval,
    refreshPaused: refreshPaused === AUTOREFRESH_IS_PAUSED ? undefined : refreshPaused,
  };
};
export const AutoRefreshButton = () => {
  const dispatch = useDispatch();

  const refreshPaused = useSelector(selectRefreshPaused);
  const refreshInterval = useSelector(selectRefreshInterval);

  const [getUrlsParams, updateUrlParams] = useUrlParams();

  const { refreshInterval: urlRefreshInterval, refreshPaused: urlIsPaused } = getUrlsParams();

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // sync url state with redux state on first render
      dispatch(setRefreshIntervalAction(urlRefreshInterval));
      dispatch(setRefreshPausedAction(urlIsPaused));
      isFirstRender.current = false;
    } else {
      // sync redux state with url state on subsequent renders
      if (urlRefreshInterval !== refreshInterval || urlIsPaused !== refreshPaused) {
        updateUrlParams(
          replaceDefaults({
            refreshInterval,
            refreshPaused,
          }),
          true
        );
      }
    }
  }, [updateUrlParams, refreshInterval, refreshPaused, urlRefreshInterval, urlIsPaused, dispatch]);

  const onRefreshChange = (newProps: OnRefreshChangeProps) => {
    dispatch(setRefreshIntervalAction(newProps.refreshInterval / 1000));
    dispatch(setRefreshPausedAction(newProps.isPaused));

    updateUrlParams(
      replaceDefaults({
        refreshInterval: newProps.refreshInterval / 1000,
        refreshPaused: newProps.isPaused,
      }),
      true
    );
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
