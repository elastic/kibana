/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

import { useHistory, useLocation } from 'react-router-dom';

import { useSelector } from 'react-redux';
import { useSetInitialStateFromUrl } from './initialize_redux_by_url';
import { useKibana } from '../../lib/kibana';
import { CONSTANTS } from './constants';
import {
  getQueryStringFromLocation,
  getParamFromQueryString,
  getTitle,
  replaceStatesInLocation,
  decodeRisonUrlState,
  encodeRisonUrlState,
  isQueryStateEmpty,
  updateTimerangeUrl,
  makeMapStateToProps,
} from './helpers';
import {
  ReplaceStateInLocation,
  PreviousLocationUrlState,
  KeyUrlState,
  ALL_URL_STATE_KEYS,
  UrlStateToRedux,
  UrlState,
  ValueUrlState,
} from './types';
import { TimelineUrl } from '../../../timelines/store/timeline/model';
import { UrlInputsModel } from '../../store/inputs/model';
import { getScopeFromPath, useSourcererDataView } from '../../containers/sourcerer';
import { navTabs as NAV_TABS } from '../../../app/home/home_navigations';
import { SecurityPageName } from '../../../app/types';

// This hook should be called from a page.
// It will sync any redux store update with the URL
// Things missing: Update timerange and removing empty query strings
export const useSyncQueryStringWithReduxStore = () => {
  const { pathname, search } = useLocation();
  const history = useHistory();
  const stateToProps = makeMapStateToProps();
  const { urlState } = useSelector(stateToProps);
  const prevProps = usePrevious({ urlState });

  useEffect(() => {
    /**
     * Update query string with data from the redux store.
     */
    if (!deepEqual(urlState, prevProps.urlState)) {
      const urlStateUpdatesToLocation: ReplaceStateInLocation[] = ALL_URL_STATE_KEYS.map(
        (urlKey: KeyUrlState) => ({
          urlStateToReplace: getUrlStateKeyValue(urlState, urlKey),
          urlStateKey: urlKey,
        })
      );
      replaceStatesInLocation(urlStateUpdatesToLocation, pathname, search, history);
    }
  }, [history, pathname, search, urlState, prevProps.urlState]);
};

// has to be called from App level
export const useInitializeReduxStoreFromQueryString = () => {
  const { pathname, search } = useLocation();
  const history = useHistory();
  const stateToProps = makeMapStateToProps();
  const { urlState } = useSelector(stateToProps);
  const { filterManager, savedQueries } = useKibana().services.data.query;
  const { indexPattern } = useSourcererDataView(getScopeFromPath(pathname));
  const { setInitialStateFromUrl } = useSetInitialStateFromUrl();

  useEffect(() => {
    const urlStateUpdatesToStore: UrlStateToRedux[] = [];
    const urlStateUpdatesToLocation: ReplaceStateInLocation[] = [];

    ALL_URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getQueryStringKeyValue({ urlKey, search });

      // If query string value is empty get set the value from store
      if (!newUrlStateString) {
        urlStateUpdatesToLocation.push({
          urlStateToReplace: getUrlStateKeyValue(urlState, urlKey),
          urlStateKey: urlKey,
        });
      } else {
        // Updates the new URL query string.
        const stateToUpdate = getUpdateToFormatUrlStateString({
          isFirstPageLoad: true,
          newUrlStateString,
          updateTimerange: true,
          urlKey,
        });

        if (stateToUpdate) {
          urlStateUpdatesToLocation.push(stateToUpdate);
        }

        const updatedUrlStateString = stateToUpdate
          ? encodeRisonUrlState(stateToUpdate.urlStateToReplace)
          : newUrlStateString;

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
    });

    replaceStatesInLocation(urlStateUpdatesToLocation, pathname, search, history);

    setInitialStateFromUrl({
      filterManager,
      indexPattern,
      pathname,
      savedQueries,
      urlStateToUpdate: urlStateUpdatesToStore,
    });
    // It should only be called when the APP initializes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TODO Move it somewhere else
  // useEffect(() => {
  //   queryTimelineByIdOnUrlChange({
  //     oldSearch: prevProps.search,
  //     search,
  //     timelineIdFromReduxStore: urlState.timeline.id,
  //     updateTimeline,
  //     updateTimelineIsLoading,
  //   });
  // }, [search, prevProps.search, urlState.timeline.id, updateTimeline, updateTimelineIsLoading]);
};

export const usePageTitle = (pageName: SecurityPageName) => {
  useEffect(() => {
    document.title = `${getTitle(pageName, NAV_TABS)} - Kibana`;
  }, [pageName]);
};

export const useClearQueryString = () => {
  const { pathname, search } = useLocation();
  const history = useHistory();

  useEffect(() => {
    const urlStateUpdatesToLocation: ReplaceStateInLocation[] = [];
    ALL_URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
      urlStateUpdatesToLocation.push({
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    });
    replaceStatesInLocation(urlStateUpdatesToLocation, pathname, search, history);
  }, [pathname, search, history]);
};

function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef<PreviousLocationUrlState>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

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
