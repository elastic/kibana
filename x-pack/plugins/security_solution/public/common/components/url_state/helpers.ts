/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'query-string';
import { decode, encode } from 'rison-node';
import type * as H from 'history';

import { url } from '@kbn/kibana-utils-plugin/public';

import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import type { State } from '../../store';
import type { TimelineUrl } from '../../../timelines/store/timeline/model';
import { timelineSelectors } from '../../../timelines/store/timeline';
import type { NavTab } from '../navigation/types';
import type { UrlStateType } from './constants';
import { CONSTANTS } from './constants';
import type { ReplaceStateInLocation, KeyUrlState, ValueUrlState } from './types';

export const isDetectionsPages = (pageName: string) =>
  pageName === SecurityPageName.alerts ||
  pageName === SecurityPageName.rules ||
  pageName === SecurityPageName.rulesCreate ||
  pageName === SecurityPageName.exceptions;

export const decodeRisonUrlState = <T>(value: string | undefined): T | null => {
  try {
    return value ? (decode(value) as unknown as T) : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return null;
    }
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const encodeRisonUrlState = (state: any) => encode(state);

export const getQueryStringFromLocation = (search: string) => search.substring(1);

export const getParamFromQueryString = (
  queryString: string,
  key: string
): string | undefined | null => {
  const parsedQueryString = parse(queryString, { sort: false });
  const queryParam = parsedQueryString[key];

  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

export const replaceStateKeyInQueryString =
  <T>(stateKey: string, urlState: T) =>
  (queryString: string): string => {
    const previousQueryValues = parse(queryString, { sort: false });
    if (urlState == null || (typeof urlState === 'string' && urlState === '')) {
      delete previousQueryValues[stateKey];

      return stringify(url.encodeQuery(previousQueryValues), { sort: false, encode: false });
    }

    // ಠ_ಠ Code was copied from x-pack/legacy/plugins/infra/public/utils/url_state.tsx ಠ_ಠ
    // Remove this if these utilities are promoted to kibana core
    const newValue =
      typeof urlState === 'undefined'
        ? previousQueryValues
        : {
            ...previousQueryValues,
            [stateKey]: encodeRisonUrlState(urlState),
          };
    return stringify(url.encodeQuery(newValue), { sort: false, encode: false });
  };

export const replaceQueryStringInLocation = (
  location: H.Location,
  queryString: string
): H.Location => {
  if (queryString === getQueryStringFromLocation(location.search)) {
    return location;
  } else {
    return {
      ...location,
      search: `?${queryString}`,
    };
  }
};

export const getUrlType = (pageName: string): UrlStateType => {
  if (pageName === SecurityPageName.overview) {
    return 'overview';
  }
  if (pageName === SecurityPageName.landing) {
    return 'get_started';
  } else if (pageName === SecurityPageName.hosts) {
    return 'host';
  } else if (pageName === SecurityPageName.network) {
    return 'network';
  } else if (pageName === SecurityPageName.alerts) {
    return 'alerts';
  } else if (pageName === SecurityPageName.rules || pageName === SecurityPageName.rulesCreate) {
    return 'rules';
  } else if (pageName === SecurityPageName.exceptions) {
    return 'exceptions';
  } else if (pageName === SecurityPageName.timelines) {
    return 'timeline';
  } else if (pageName === SecurityPageName.case) {
    return 'cases';
  } else if (pageName === SecurityPageName.administration) {
    return 'administration';
  }
  return 'overview';
};

export const getTitle = (pageName: string, navTabs: Record<string, NavTab>): string => {
  return navTabs[pageName] != null ? navTabs[pageName].name : '';
};

export const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const flyoutTimeline = getTimeline(state, TimelineId.active);
    const timeline =
      flyoutTimeline != null
        ? {
            id: flyoutTimeline.savedObjectId != null ? flyoutTimeline.savedObjectId : '',
            isOpen: flyoutTimeline.show,
            activeTab: flyoutTimeline.activeTab,
            graphEventId: flyoutTimeline.graphEventId ?? '',
          }
        : { id: '', isOpen: false, activeTab: TimelineTabs.query, graphEventId: '' };

    return {
      urlState: {
        [CONSTANTS.timeline]: timeline,
      },
    };
  };

  return mapStateToProps;
};

export const isQueryStateEmpty = (
  queryState: ValueUrlState | undefined | null,
  urlKey: KeyUrlState
): boolean =>
  queryState == null || (urlKey === CONSTANTS.timeline && (queryState as TimelineUrl).id === '');

export const replaceStatesInLocation = (
  states: ReplaceStateInLocation[],
  pathname: string,
  search: string,
  history?: H.History
) => {
  const location = {
    hash: '',
    pathname,
    search,
    state: '',
  };

  const queryString = getQueryStringFromLocation(search);
  const newQueryString = states.reduce((updatedQueryString, { urlStateKey, urlStateToReplace }) => {
    return replaceStateKeyInQueryString(urlStateKey, urlStateToReplace)(updatedQueryString);
  }, queryString);

  const newLocation = replaceQueryStringInLocation(location, newQueryString);

  if (history) {
    newLocation.state = history.location.state;
    history.replace(newLocation);
  }
  return newLocation.search;
};
