/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import deepEqual from 'fast-deep-equal';

import { useLocation } from 'react-router-dom';

import { useSetInitialStateFromUrl } from './initialize_redux_by_url';

import { useKibana } from '../../lib/kibana';
import { CONSTANTS, UrlStateType } from './constants';
import {
  getQueryStringFromLocation,
  getParamFromQueryString,
  getUrlType,
  getTitle,
  replaceStatesInLocation,
  decodeRisonUrlState,
  isDetectionsPages,
  encodeRisonUrlState,
  isQueryStateEmpty,
  updateTimerangeUrl,
} from './helpers';
import {
  UrlStateContainerPropTypes,
  ReplaceStateInLocation,
  PreviousLocationUrlState,
  KeyUrlState,
  ALL_URL_STATE_KEYS,
  UrlStateToRedux,
  UrlState,
  isAdministration,
  ValueUrlState,
} from './types';
import { TimelineUrl } from '../../../timelines/store/timeline/model';
import { UrlInputsModel } from '../../store/inputs/model';
import { queryTimelineByIdOnUrlChange } from './query_timeline_by_id_on_url_change';

function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef<PreviousLocationUrlState>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useUrlStateHooks = ({
  indexPattern,
  navTabs,
  pageName,
  urlState,
  search,
  pathName,
  history,
}: UrlStateContainerPropTypes) => {
  const [isFirstPageLoad, setIsFirstPageLoad] = useState(true);
  const { filterManager, savedQueries } = useKibana().services.data.query;
  const { pathname: browserPathName } = useLocation();
  const prevProps = usePrevious({ pathName, pageName, urlState, search });

  const { setInitialStateFromUrl, updateTimeline, updateTimelineIsLoading } =
    useSetInitialStateFromUrl();

  const handleInitialize = useCallback(
    (type: UrlStateType) => {
      const urlStateUpdatesToStore: UrlStateToRedux[] = [];
      const urlStateUpdatesToLocation: ReplaceStateInLocation[] = [];

      // Delete all query strings from URL when the page is security/administration (Manage menu group)
      if (isAdministration(type)) {
        ALL_URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
          urlStateUpdatesToLocation.push({
            urlStateToReplace: '',
            urlStateKey: urlKey,
          });
        });
      } else {
        ALL_URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
          const newUrlStateString = getQueryStringKeyValue({ urlKey, search });

          if (!newUrlStateString) {
            urlStateUpdatesToLocation.push({
              urlStateToReplace: getUrlStateKeyValue(urlState, urlKey),
              urlStateKey: urlKey,
            });
          } else {
            // Updates the new URL query string.
            const stateToUpdate = getUpdateToFormatUrlStateString({
              isFirstPageLoad,
              newUrlStateString,
              updateTimerange: isDetectionsPages(pageName) || isFirstPageLoad,
              urlKey,
            });

            if (stateToUpdate) {
              urlStateUpdatesToLocation.push(stateToUpdate);
            }

            const updatedUrlStateString = stateToUpdate
              ? encodeRisonUrlState(stateToUpdate.urlStateToReplace)
              : newUrlStateString;

            if (
              // Update redux store with query string data on the first page load
              isFirstPageLoad ||
              // Update Redux store with data from the URL query string when navigating from a page to a detection page
              (isDetectionsPages(pageName) && updatedUrlStateString !== newUrlStateString)
            ) {
              if (
                urlKey !== CONSTANTS.timeline ||
                !isTimelinePresentInUrlStateString(newUrlStateString, urlState.timeline)
              ) {
                urlStateUpdatesToStore.push({
                  urlKey,
                  newUrlStateString: updatedUrlStateString,
                });
              }
            }
          }
        });
      }

      replaceStatesInLocation(urlStateUpdatesToLocation, pathName, search, history);

      setInitialStateFromUrl({
        filterManager,
        indexPattern,
        pageName,
        savedQueries,
        urlStateToUpdate: urlStateUpdatesToStore,
      });
    },
    [
      filterManager,
      history,
      indexPattern,
      pageName,
      pathName,
      savedQueries,
      search,
      setInitialStateFromUrl,
      urlState,
      isFirstPageLoad,
    ]
  );

  useEffect(() => {
    // When browser location and store location are out of sync, skip the execution.
    //  It happens in three scenarios:
    //  * When changing urlState and quickly moving to a new location.
    //  * Redirects as "security/hosts" -> "security/hosts/allHosts"
    //  * It also happens once on every location change because browserPathName gets updated before pathName
    // *Warning*: Removing this return would cause redirect loops that crashes the APP.
    if (browserPathName !== pathName) return;

    const type: UrlStateType = getUrlType(pageName);

    if (!deepEqual(urlState, prevProps.urlState) && !isFirstPageLoad && !isAdministration(type)) {
      const urlStateUpdatesToLocation: ReplaceStateInLocation[] = ALL_URL_STATE_KEYS.map(
        (urlKey: KeyUrlState) => ({
          urlStateToReplace: getUrlStateKeyValue(urlState, urlKey),
          urlStateKey: urlKey,
        })
      );

      replaceStatesInLocation(urlStateUpdatesToLocation, pathName, search, history);
    } else if (
      (isFirstPageLoad && pageName != null && pageName !== '') ||
      pathName !== prevProps.pathName
    ) {
      handleInitialize(type);
      setIsFirstPageLoad(false);
    }
  }, [
    isFirstPageLoad,
    history,
    pathName,
    pageName,
    prevProps,
    urlState,
    browserPathName,
    handleInitialize,
    search,
  ]);

  useEffect(() => {
    document.title = `${getTitle(pageName, navTabs)} - Kibana`;
  }, [pageName, navTabs]);

  useEffect(() => {
    queryTimelineByIdOnUrlChange({
      oldSearch: prevProps.search,
      search,
      timelineIdFromReduxStore: urlState.timeline.id,
      updateTimeline,
      updateTimelineIsLoading,
    });
  }, [search, prevProps.search, urlState.timeline.id, updateTimeline, updateTimelineIsLoading]);

  return null;
};

const getUrlStateKeyValue = (urlState: UrlState, urlKey: KeyUrlState) =>
  isQueryStateEmpty(urlState[urlKey], urlKey) ? '' : urlState[urlKey];

const getQueryStringKeyValue = ({ search, urlKey }: { search: string; urlKey: string }) =>
  getParamFromQueryString(getQueryStringFromLocation(search), urlKey);

export const getUpdateToFormatUrlStateString = ({
  isFirstPageLoad,
  newUrlStateString,
  updateTimerange,
  urlKey,
}: {
  isFirstPageLoad: boolean;
  newUrlStateString: string;
  updateTimerange: boolean;
  urlKey: KeyUrlState;
}): ReplaceStateInLocation | undefined => {
  if (isQueryStateEmpty(decodeRisonUrlState<ValueUrlState>(newUrlStateString), urlKey)) {
    return {
      urlStateToReplace: '',
      urlStateKey: urlKey,
    };
  } else if (urlKey === CONSTANTS.timerange && updateTimerange) {
    const queryState = decodeRisonUrlState<UrlInputsModel>(newUrlStateString);
    if (queryState != null && queryState.global != null) {
      return {
        urlStateToReplace: updateTimerangeUrl(queryState, isFirstPageLoad),
        urlStateKey: urlKey,
      };
    }
  }
  return undefined;
};

const isTimelinePresentInUrlStateString = (urlStateString: string, timeline: TimelineUrl) => {
  const timelineFromUrl = decodeRisonUrlState<TimelineUrl>(urlStateString);
  return timelineFromUrl != null && timelineFromUrl.id === timeline.id;
};
