/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { parse, stringify } from 'query-string';
import { decode, encode } from 'rison-node';
import * as H from 'history';

import type { Filter, Query } from '@kbn/es-query';

import { url } from '../../../../../../../src/plugins/kibana_utils/public';

import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import { inputsSelectors, State } from '../../store';
import { UrlInputsModel } from '../../store/inputs/model';
import { TimelineUrl } from '../../../timelines/store/timeline/model';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { formatDate } from '../super_date_picker';
import { NavTab } from '../navigation/types';
import { CONSTANTS, UrlStateType } from './constants';
import { ReplaceStateInLocation, KeyUrlState, ValueUrlState } from './types';
import { sourcererSelectors } from '../../store/sourcerer';
import { SourcererScopeName, SourcererUrlState } from '../../store/sourcerer/model';

export const isDetectionsPages = (pageName: string) =>
  pageName === SecurityPageName.alerts ||
  pageName === SecurityPageName.rules ||
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

export const getParamFromQueryString = (queryString: string, key: string) => {
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
  } else if (pageName === SecurityPageName.hosts) {
    return 'host';
  } else if (pageName === SecurityPageName.network) {
    return 'network';
  } else if (pageName === SecurityPageName.alerts) {
    return 'alerts';
  } else if (pageName === SecurityPageName.rules) {
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
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getGlobalSavedQuerySelector = inputsSelectors.globalSavedQuerySelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getSourcererScopes = sourcererSelectors.scopesSelector();
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

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

    let searchAttr: {
      [CONSTANTS.appQuery]?: Query;
      [CONSTANTS.filters]?: Filter[];
      [CONSTANTS.savedQuery]?: string;
    } = {
      [CONSTANTS.appQuery]: getGlobalQuerySelector(state),
      [CONSTANTS.filters]: getGlobalFiltersQuerySelector(state),
    };
    const savedQuery = getGlobalSavedQuerySelector(state);
    if (savedQuery != null && savedQuery.id !== '') {
      searchAttr = {
        [CONSTANTS.savedQuery]: savedQuery.id,
      };
    }
    const sourcerer = getSourcererScopes(state);
    const activeScopes: SourcererScopeName[] = Object.keys(sourcerer) as SourcererScopeName[];
    const selectedPatterns: SourcererUrlState = activeScopes
      .filter((scope) => scope === SourcererScopeName.default)
      .reduce(
        (acc, scope) => ({
          ...acc,
          [scope]: {
            id: sourcerer[scope]?.selectedDataViewId,
            selectedPatterns: sourcerer[scope]?.selectedPatterns,
          },
        }),
        {}
      );

    return {
      urlState: {
        ...searchAttr,
        [CONSTANTS.sourcerer]: selectedPatterns,
        [CONSTANTS.timerange]: {
          global: {
            [CONSTANTS.timerange]: globalTimerange,
            linkTo: globalLinkTo,
          },
          timeline: {
            [CONSTANTS.timerange]: timelineTimerange,
            linkTo: timelineLinkTo,
          },
        },
        [CONSTANTS.timeline]: timeline,
      },
    };
  };

  return mapStateToProps;
};

export const updateTimerangeUrl = (
  timeRange: UrlInputsModel,
  isFirstPageLoad: boolean
): UrlInputsModel => {
  if (timeRange.global.timerange.kind === 'relative') {
    timeRange.global.timerange.from = formatDate(timeRange.global.timerange.fromStr);
    timeRange.global.timerange.to = formatDate(timeRange.global.timerange.toStr, { roundUp: true });
  }
  if (timeRange.timeline.timerange.kind === 'relative' && isFirstPageLoad) {
    timeRange.timeline.timerange.from = formatDate(timeRange.timeline.timerange.fromStr);
    timeRange.timeline.timerange.to = formatDate(timeRange.timeline.timerange.toStr, {
      roundUp: true,
    });
  }
  return timeRange;
};

export const isQueryStateEmpty = (
  queryState: ValueUrlState | undefined | null,
  urlKey: KeyUrlState
): boolean =>
  queryState == null ||
  (urlKey === CONSTANTS.appQuery && isEmpty((queryState as Query).query)) ||
  (urlKey === CONSTANTS.filters && isEmpty(queryState)) ||
  (urlKey === CONSTANTS.timeline && (queryState as TimelineUrl).id === '');

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
