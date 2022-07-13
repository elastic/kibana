/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { Location } from 'history';

import type { Filter, Query } from '@kbn/es-query';
import type { UrlInputsModel } from '../../store/inputs/model';
import type { TimelineUrl } from '../../../timelines/store/timeline/model';
import { CONSTANTS } from '../url_state/constants';
import type { KeyUrlState, UrlState } from '../url_state/types';
import { isAdministration, ALL_URL_STATE_KEYS } from '../url_state/types';
import {
  replaceQueryStringInLocation,
  replaceStateKeyInQueryString,
  getQueryStringFromLocation,
} from '../url_state/helpers';

import type { SearchNavTab } from './types';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useUiSetting$ } from '../../lib/kibana';
import { ENABLE_GROUPED_NAVIGATION } from '../../../../common/constants';

export const getSearch = (
  tab: SearchNavTab,
  urlState: UrlState,
  globalQueryString: string
): string => {
  if (tab && tab.urlKey != null && !isAdministration(tab.urlKey)) {
    // TODO: Temporary code while we are migrating all query strings to global_query_string_manager
    if (globalQueryString.length > 0) {
      return `${getUrlStateSearch(urlState)}&${globalQueryString}`;
    } else {
      return getUrlStateSearch(urlState);
    }
  }

  return '';
};

export const getUrlStateSearch = (urlState: UrlState): string =>
  ALL_URL_STATE_KEYS.reduce<Location>(
    (myLocation: Location, urlKey: KeyUrlState) => {
      let urlStateToReplace: Filter[] | Query | TimelineUrl | UrlInputsModel | string = '';

      if (urlKey === CONSTANTS.appQuery && urlState.query != null) {
        if (urlState.query.query === '') {
          urlStateToReplace = '';
        } else {
          urlStateToReplace = urlState.query;
        }
      } else if (urlKey === CONSTANTS.filters && urlState.filters != null) {
        if (isEmpty(urlState.filters)) {
          urlStateToReplace = '';
        } else {
          urlStateToReplace = urlState.filters;
        }
      } else if (urlKey === CONSTANTS.timerange) {
        urlStateToReplace = urlState[CONSTANTS.timerange];
      } else if (urlKey === CONSTANTS.timeline && urlState[CONSTANTS.timeline] != null) {
        const timeline = urlState[CONSTANTS.timeline];
        if (timeline.id === '') {
          urlStateToReplace = '';
        } else {
          urlStateToReplace = timeline;
        }
      }
      return replaceQueryStringInLocation(
        myLocation,
        replaceStateKeyInQueryString(
          urlKey,
          urlStateToReplace
        )(getQueryStringFromLocation(myLocation.search))
      );
    },
    {
      pathname: '',
      hash: '',
      search: '',
      state: '',
    }
  ).search;

/**
 * Hook to check if the new grouped navigation is enabled on both experimental flag and advanced settings
 * TODO: remove this function when flag and setting not needed
 */
export const useIsGroupedNavigationEnabled = () => {
  const groupedNavFlagEnabled = useIsExperimentalFeatureEnabled('groupedNavigation');
  const [groupedNavSettingEnabled] = useUiSetting$<boolean>(ENABLE_GROUPED_NAVIGATION);
  return groupedNavFlagEnabled && groupedNavSettingEnabled;
};
