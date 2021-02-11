/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { debounce, distinctUntilChanged, map, mapTo, switchMap, tap } from 'rxjs/operators';
import { merge, of, timer } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { SearchSessionIndicator, SearchSessionIndicatorRef } from '../search_session_indicator';
import {
  ISessionService,
  SearchSessionState,
  SearchUsageCollector,
  TimefilterContract,
} from '../../../../../../../src/plugins/data/public';
import { RedirectAppLinks } from '../../../../../../../src/plugins/kibana_react/public';
import { ApplicationStart } from '../../../../../../../src/core/public';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { useSearchSessionTour } from './search_session_tour';

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
  usageCollector?: SearchUsageCollector;
}

export const createConnectedSearchSessionIndicator = ({
  sessionService,
  application,
  timeFilter,
  storage,
  disableSaveAfterSessionCompletesTimeout,
  usageCollector,
}: SearchSessionIndicatorDeps): React.FC => {
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
    distinctUntilChanged(),
    tap((value) => {
      if (value) usageCollector?.trackSessionIndicatorTourDisabled();
    })
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

    // check if user doesn't have access to search_sessions and search_sessions mgtm
    // this happens in case there is no app that allows current user to use search session
    if (!sessionService.hasAccess()) {
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
      saveDisabled,
      usageCollector
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
      usageCollector?.trackSessionSentToBackground();
      sessionService.save();
    }, [saveDisabled]);

    const onSaveResults = useCallback(() => {
      if (saveDisabled) return;
      usageCollector?.trackSessionSavedResults();
      sessionService.save();
    }, [saveDisabled]);

    const onCancel = useCallback(() => {
      usageCollector?.trackSessionCancelled();
      sessionService.cancel();
    }, []);

    const onViewSearchSessions = useCallback(() => {
      usageCollector?.trackViewSessionsList();
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
          onViewSearchSessions={onViewSearchSessions}
        />
      </RedirectAppLinks>
    );
  };
};
