/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, isEmpty } from 'lodash/fp';
import { useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { useLocation } from 'react-router-dom';
import { useKibana } from '../../lib/kibana';
import { CONSTANTS, UrlStateType } from './constants';
import {
  getQueryStringFromLocation,
  getParamFromQueryString,
  getUrlType,
  getTitle,
  replaceStateInLocation,
  updateUrlStateString,
  decodeRisonUrlState,
  isDetectionsPages,
} from './helpers';
import {
  UrlStateContainerPropTypes,
  PreviousLocationUrlState,
  URL_STATE_KEYS,
  KeyUrlState,
  ALL_URL_STATE_KEYS,
  UrlStateToRedux,
  UrlState,
} from './types';
import { TimelineUrl } from '../../../timelines/store/timeline/model';
function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef<PreviousLocationUrlState>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const updateTimelineAtinitialization = (
  urlKey: CONSTANTS,
  newUrlStateString: string,
  urlState: UrlState
) => {
  let updateUrlState = true;
  if (urlKey === CONSTANTS.timeline) {
    const timeline = decodeRisonUrlState<TimelineUrl>(newUrlStateString);
    if (timeline != null && urlState.timeline.id === timeline.id) {
      updateUrlState = false;
    }
  }
  return updateUrlState;
};

export const useUrlStateHooks = ({
  detailName,
  indexPattern,
  navTabs,
  pageName,
  setInitialStateFromUrl,
  updateTimeline,
  updateTimelineIsLoading,
  urlState,
  search,
  pathName,
  history,
}: UrlStateContainerPropTypes) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const { filterManager, savedQueries } = useKibana().services.data.query;
  const { pathname: browserPathName } = useLocation();
  const prevProps = usePrevious({ pathName, pageName, urlState });

  const handleInitialize = (type: UrlStateType, needUpdate?: boolean) => {
    let mySearch = search;
    let urlStateToUpdate: UrlStateToRedux[] = [];
    URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(mySearch),
        urlKey
      );
      if (newUrlStateString) {
        mySearch = updateUrlStateString({
          history,
          isInitializing,
          newUrlStateString,
          pathName,
          search: mySearch,
          updateTimerange: (needUpdate ?? false) || isInitializing,
          urlKey,
        });
        if (isInitializing || needUpdate) {
          const updatedUrlStateString =
            getParamFromQueryString(getQueryStringFromLocation(mySearch), urlKey) ??
            newUrlStateString;
          if (isInitializing || !deepEqual(updatedUrlStateString, newUrlStateString)) {
            if (updateTimelineAtinitialization(urlKey, newUrlStateString, urlState)) {
              urlStateToUpdate = [
                ...urlStateToUpdate,
                {
                  urlKey,
                  newUrlStateString: updatedUrlStateString,
                },
              ];
            }
          }
        }
      } else if (
        urlKey === CONSTANTS.appQuery &&
        urlState[urlKey] != null &&
        urlState[urlKey]?.query === ''
      ) {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: '',
          urlStateKey: urlKey,
        });
      } else if (urlKey === CONSTANTS.filters && isEmpty(urlState[urlKey])) {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: '',
          urlStateKey: urlKey,
        });
      } else if (
        urlKey === CONSTANTS.timeline &&
        urlState[urlKey] != null &&
        urlState[urlKey].id === ''
      ) {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: '',
          urlStateKey: urlKey,
        });
      } else {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: urlState[urlKey] || '',
          urlStateKey: urlKey,
        });
      }
    });
    difference(ALL_URL_STATE_KEYS, URL_STATE_KEYS[type]).forEach((urlKey: KeyUrlState) => {
      mySearch = replaceStateInLocation({
        history,
        pathName,
        search: mySearch,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    });

    setInitialStateFromUrl({
      detailName,
      filterManager,
      indexPattern,
      pageName,
      savedQueries,
      updateTimeline,
      updateTimelineIsLoading,
      urlStateToUpdate,
    })();
  };

  useEffect(() => {
    // When browser location and store location are out of sync, skip the execution.
    //  It happens in three scenarios:
    //  * When changing urlState and quickly moving to a new location.
    //  * Redirects as "security/hosts" -> "security/hosts/allHosts"
    //  * It also happens once on every location change because browserPathName gets updated before pathName
    // *Warning*: Removing this return would cause redirect loops that crashes the APP.
    if (browserPathName !== pathName) return;

    const type: UrlStateType = getUrlType(pageName);
    if (isInitializing && pageName != null && pageName !== '') {
      handleInitialize(type);
      setIsInitializing(false);
    } else if (!deepEqual(urlState, prevProps.urlState) && !isInitializing) {
      let mySearch = search;
      URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
        if (
          urlKey === CONSTANTS.appQuery &&
          urlState[urlKey] != null &&
          urlState[urlKey]?.query === ''
        ) {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: '',
            urlStateKey: urlKey,
          });
        } else if (urlKey === CONSTANTS.filters && isEmpty(urlState[urlKey])) {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: '',
            urlStateKey: urlKey,
          });
        } else if (
          urlKey === CONSTANTS.timeline &&
          urlState[urlKey] != null &&
          urlState[urlKey].id === ''
        ) {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: '',
            urlStateKey: urlKey,
          });
        } else {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: urlState[urlKey] || '',
            urlStateKey: urlKey,
          });
        }
      });
    } else if (pathName !== prevProps.pathName) {
      handleInitialize(type, isDetectionsPages(pageName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, history, pathName, pageName, prevProps, urlState, browserPathName]);

  useEffect(() => {
    document.title = `${getTitle(pageName, detailName, navTabs)} - Kibana`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName]);

  return null;
};
