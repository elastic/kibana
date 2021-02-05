/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { debounce, distinctUntilChanged, map } from 'rxjs/operators';
import { timer } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { SearchSessionIndicator, SearchSessionIndicatorRef } from '../search_session_indicator';
import {
  ISessionService,
  SearchSessionState,
  TimefilterContract,
} from '../../../../../../../src/plugins/data/public/';
import { RedirectAppLinks } from '../../../../../../../src/plugins/kibana_react/public';
import { ApplicationStart } from '../../../../../../../src/core/public';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { useSearchSessionTour } from './search_session_tour';

export interface SearchSessionIndicatorDeps {
  sessionService: ISessionService;
  timeFilter: TimefilterContract;
  application: ApplicationStart;
  storage: IStorageWrapper;
}

export const createConnectedSearchSessionIndicator = ({
  sessionService,
  application,
  timeFilter,
  storage,
}: SearchSessionIndicatorDeps): React.FC => {
  const isAutoRefreshEnabled = () => !timeFilter.getRefreshInterval().pause;
  const isAutoRefreshEnabled$ = timeFilter
    .getRefreshIntervalUpdate$()
    .pipe(map(isAutoRefreshEnabled), distinctUntilChanged());

  const debouncedSessionServiceState$ = sessionService.state$.pipe(
    debounce((_state) => timer(_state === SearchSessionState.None ? 50 : 300)) // switch to None faster to quickly remove indicator when navigating away
  );

  return () => {
    const ref = useRef<SearchSessionIndicatorRef>(null);
    const state = useObservable(debouncedSessionServiceState$, SearchSessionState.None);
    const autoRefreshEnabled = useObservable(isAutoRefreshEnabled$, isAutoRefreshEnabled());
    const isDisabledByApp = sessionService.getSearchSessionIndicatorUiConfig().isDisabled();

    let disabled = false;
    let disabledReasonText: string = '';

    if (autoRefreshEnabled) {
      disabled = true;
      disabledReasonText = i18n.translate(
        'xpack.data.searchSessionIndicator.disabledDueToAutoRefreshMessage',
        {
          defaultMessage: 'Search sessions are not available when auto refresh is enabled.',
        }
      );
    }

    const { markOpenedDone, markRestoredDone } = useSearchSessionTour(
      storage,
      ref,
      state,
      disabled
    );

    if (isDisabledByApp.disabled) {
      disabled = true;
      disabledReasonText = isDisabledByApp.reasonText;
    }

    if (!sessionService.isSessionStorageReady()) return null;
    return (
      <RedirectAppLinks application={application}>
        <SearchSessionIndicator
          ref={ref}
          state={state}
          onContinueInBackground={() => {
            sessionService.save();
          }}
          onSaveResults={() => {
            sessionService.save();
          }}
          onCancel={() => {
            sessionService.cancel();
          }}
          disabled={disabled}
          disabledReasonText={disabledReasonText}
          onOpened={(openedState) => {
            markOpenedDone();
            if (openedState === SearchSessionState.Restored) {
              markRestoredDone();
            }
          }}
        />
      </RedirectAppLinks>
    );
  };
};
