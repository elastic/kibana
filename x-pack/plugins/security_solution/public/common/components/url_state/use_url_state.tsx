/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, isEmpty } from 'lodash/fp';
import { useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { useKibana } from '../../lib/kibana';
import { useApolloClient } from '../../utils/apollo_context';
import { CONSTANTS, UrlStateType } from './constants';
import {
  getQueryStringFromLocation,
  getParamFromQueryString,
  getUrlType,
  getTitle,
  replaceStateInLocation,
  updateUrlStateString,
} from './helpers';
import {
  UrlStateContainerPropTypes,
  PreviousLocationUrlState,
  URL_STATE_KEYS,
  KeyUrlState,
  ALL_URL_STATE_KEYS,
  UrlStateToRedux,
} from './types';
import { SecurityPageName } from '../../../app/types';

function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef<PreviousLocationUrlState>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useUrlStateHooks = ({
  detailName,
  indexPattern,
  history,
  navTabs,
  pageName,
  pathName,
  search,
  setInitialStateFromUrl,
  updateTimeline,
  updateTimelineIsLoading,
  urlState,
}: UrlStateContainerPropTypes) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const apolloClient = useApolloClient();
  const { filterManager, savedQueries } = useKibana().services.data.query;
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
            urlStateToUpdate = [
              ...urlStateToUpdate,
              {
                urlKey,
                newUrlStateString: updatedUrlStateString,
              },
            ];
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
      apolloClient,
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
      handleInitialize(type, pageName === SecurityPageName.detections);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, history, pathName, pageName, prevProps, urlState]);

  useEffect(() => {
    document.title = `${getTitle(pageName, detailName, navTabs)} - Kibana`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName]);

  return null;
};
