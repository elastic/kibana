/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { debounce, distinctUntilChanged, map, mapTo, switchMap } from 'rxjs/operators';
import { merge, of, timer } from 'rxjs';
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
import {
  getSearchSessionsCapabilities,
  SEARCH_SESSIONS_MANAGEMENT_ID,
} from '../../../../../../../src/plugins/data/common';

export interface SearchSessionIndicatorDeps {
  sessionService: ISessionService;
  timeFilter: TimefilterContract;
  application: ApplicationStart;
  storage: IStorageWrapper;
  /**
   * Controls for how long we allow to save a session,
   * after the last search in the session has completed
   */
  disableSaveAfterSessionCompletesTimeout: number;
}

export const createConnectedSearchSessionIndicator = ({
  sessionService,
  application,
  timeFilter,
  storage,
  disableSaveAfterSessionCompletesTimeout,
}: SearchSessionIndicatorDeps): React.FC => {
  // check if user doesn't have access to search_sessions and search_sessions
  // mgtm because root level `search_sessions` feature is disabled
  // NOTE: saveing search_session can also be disabled on per-app basis and controlled by apps' sub-features,
  // see: `isSaveDisabledByApp`
  const areSearchSessionsGloballyDisabled =
    !(
      application.capabilities.management?.kibana?.[SEARCH_SESSIONS_MANAGEMENT_ID] &&
      getSearchSessionsCapabilities(application.capabilities).create
    ) ?? true;

  const isAutoRefreshEnabled = () => !timeFilter.getRefreshInterval().pause;
  const isAutoRefreshEnabled$ = timeFilter
    .getRefreshIntervalUpdate$()
    .pipe(map(isAutoRefreshEnabled), distinctUntilChanged());

  const debouncedSessionServiceState$ = sessionService.state$.pipe(
    debounce((_state) => timer(_state === SearchSessionState.None ? 50 : 300)) // switch to None faster to quickly remove indicator when navigating away
  );

  const disableSaveAfterSessionCompleteTimedOut$ = sessionService.state$.pipe(
    switchMap((_state) =>
      _state === SearchSessionState.Completed
        ? merge(of(false), timer(disableSaveAfterSessionCompletesTimeout).pipe(mapTo(true)))
        : of(false)
    ),
    distinctUntilChanged()
  );

  return () => {
    const state = useObservable(debouncedSessionServiceState$, SearchSessionState.None);
    const autoRefreshEnabled = useObservable(isAutoRefreshEnabled$, isAutoRefreshEnabled());
    const isSaveDisabledByApp = sessionService.getSearchSessionIndicatorUiConfig().isDisabled();
    const disableSaveAfterSessionCompleteTimedOut = useObservable(
      disableSaveAfterSessionCompleteTimedOut$,
      false
    );
    const [
      searchSessionIndicator,
      setSearchSessionIndicator,
    ] = useState<SearchSessionIndicatorRef | null>(null);
    const searchSessionIndicatorRef = useCallback((ref: SearchSessionIndicatorRef) => {
      if (ref !== null) {
        setSearchSessionIndicator(ref);
      }
    }, []);

    let saveDisabled = false;
    let saveDisabledReasonText: string = '';

    let managementDisabled = false;
    let managementDisabledReasonText: string = '';

    if (autoRefreshEnabled) {
      saveDisabled = true;
      saveDisabledReasonText = i18n.translate(
        'xpack.data.searchSessionIndicator.disabledDueToAutoRefreshMessage',
        {
          defaultMessage: 'Saving search session is not available when auto refresh is enabled.',
        }
      );
    }

    if (disableSaveAfterSessionCompleteTimedOut) {
      saveDisabled = true;
      saveDisabledReasonText = i18n.translate(
        'xpack.data.searchSessionIndicator.disabledDueToTimeoutMessage',
        {
          defaultMessage: 'Search session results expired.',
        }
      );
    }

    if (isSaveDisabledByApp.disabled) {
      saveDisabled = true;
      saveDisabledReasonText = isSaveDisabledByApp.reasonText;
    }

    if (areSearchSessionsGloballyDisabled) {
      managementDisabled = saveDisabled = true;
      managementDisabledReasonText = saveDisabledReasonText = i18n.translate(
        'xpack.data.searchSessionIndicator.disabledDueToDisabledGloballyMessage',
        {
          defaultMessage: "You don't have permissions to manage search sessions",
        }
      );
    }

    const { markOpenedDone, markRestoredDone } = useSearchSessionTour(
      storage,
      searchSessionIndicator,
      state,
      saveDisabled
    );

    const onOpened = useCallback(
      (openedState: SearchSessionState) => {
        markOpenedDone();
        if (openedState === SearchSessionState.Restored) {
          markRestoredDone();
        }
      },
      [markOpenedDone, markRestoredDone]
    );

    const onContinueInBackground = useCallback(() => {
      if (saveDisabled) return;
      sessionService.save();
    }, [saveDisabled]);

    const onSaveResults = useCallback(() => {
      if (saveDisabled) return;
      sessionService.save();
    }, [saveDisabled]);

    const onCancel = useCallback(() => {
      sessionService.cancel();
    }, []);

    if (!sessionService.isSessionStorageReady()) return null;
    return (
      <RedirectAppLinks application={application}>
        <SearchSessionIndicator
          ref={searchSessionIndicatorRef}
          state={state}
          saveDisabled={saveDisabled}
          saveDisabledReasonText={saveDisabledReasonText}
          managementDisabled={managementDisabled}
          managementDisabledReasonText={managementDisabledReasonText}
          onContinueInBackground={onContinueInBackground}
          onSaveResults={onSaveResults}
          onCancel={onCancel}
          onOpened={onOpened}
        />
      </RedirectAppLinks>
    );
  };
};
