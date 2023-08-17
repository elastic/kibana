/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { ExpandableFlyoutApi, ExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useSyncToUrl } from '@kbn/url-state';
import last from 'lodash/last';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';

export const FLYOUT_URL_PARAM = URL_PARAM_KEY.eventFlyout;

type FlyoutState = Parameters<ExpandableFlyoutApi['openFlyout']>[0];

/**
 * Sync flyout state with the url and open it when relevant url state is detected in the query string
 * @returns [ref, flyoutChangesHandler]
 */
export const useSyncFlyoutStateWithUrl = () => {
  const flyoutApi = useRef<ExpandableFlyoutApi>(null);

  const syncStateToUrl = useSyncToUrl<FlyoutState>(FLYOUT_URL_PARAM, (data) => {
    flyoutApi.current?.openFlyout(data);
  });

  // This should be bound to flyout changed and closed events.
  // When flyout is closed, url state is cleared
  const handleFlyoutChanges = useCallback(
    (state?: ExpandableFlyoutContext['panels']) => {
      if (!state) {
        return syncStateToUrl(undefined);
      }

      return syncStateToUrl({
        ...state,
        preview: last(state.preview),
      });
    },
    [syncStateToUrl]
  );

  return [flyoutApi, handleFlyoutChanges] as const;
};
