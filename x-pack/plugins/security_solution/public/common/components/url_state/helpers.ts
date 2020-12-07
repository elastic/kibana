/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { parse, stringify } from 'query-string';
import { decode, encode } from 'rison-node';
import * as H from 'history';

import { Query, Filter } from '../../../../../../../src/plugins/data/public';
import { url } from '../../../../../../../src/plugins/kibana_utils/public';

import { TimelineId } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import { inputsSelectors, State } from '../../store';
import { UrlInputsModel } from '../../store/inputs/model';
import { TimelineTabs, TimelineUrl } from '../../../timelines/store/timeline/model';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { formatDate } from '../super_date_picker';
import { NavTab } from '../navigation/types';
import { CONSTANTS, UrlStateType } from './constants';
import { ReplaceStateInLocation, UpdateUrlStateString } from './types';
import { sourcererSelectors } from '../../store/sourcerer';
import { SourcererScopeName, SourcererScopePatterns } from '../../store/sourcerer/model';

export const decodeRisonUrlState = <T>(value: string | undefined): T | null => {
  try {
    return value ? ((decode(value) as unknown) as T) : null;
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

export const replaceStateKeyInQueryString = <T>(stateKey: string, urlState: T) => (
  queryString: string
): string => {
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
  } else if (pageName === SecurityPageName.detections) {
    return 'detections';
  } else if (pageName === SecurityPageName.timelines) {
    return 'timeline';
  } else if (pageName === SecurityPageName.case) {
    return 'case';
  } else if (pageName === SecurityPageName.administration) {
    return 'administration';
  }
  return 'overview';
};

export const getTitle = (
  pageName: string,
  detailName: string | undefined,
  navTabs: Record<string, NavTab>
): string => {
  if (detailName != null) return detailName;
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
    const selectedPatterns: SourcererScopePatterns = activeScopes
      .filter((scope) => scope === SourcererScopeName.default)
      .reduce((acc, scope) => ({ ...acc, [scope]: sourcerer[scope]?.selectedPatterns }), {});

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
  isInitializing: boolean
): UrlInputsModel => {
  if (timeRange.global.timerange.kind === 'relative') {
    timeRange.global.timerange.from = formatDate(timeRange.global.timerange.fromStr);
    timeRange.global.timerange.to = formatDate(timeRange.global.timerange.toStr, { roundUp: true });
  }
  if (timeRange.timeline.timerange.kind === 'relative' && isInitializing) {
    timeRange.timeline.timerange.from = formatDate(timeRange.timeline.timerange.fromStr);
    timeRange.timeline.timerange.to = formatDate(timeRange.timeline.timerange.toStr, {
      roundUp: true,
    });
  }
  return timeRange;
};

export const updateUrlStateString = ({
  isInitializing,
  history,
  newUrlStateString,
  pathName,
  search,
  updateTimerange,
  urlKey,
}: UpdateUrlStateString): string => {
  if (urlKey === CONSTANTS.appQuery) {
    const queryState = decodeRisonUrlState<Query>(newUrlStateString);
    if (queryState != null && queryState.query === '') {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    }
  } else if (urlKey === CONSTANTS.timerange && updateTimerange) {
    const queryState = decodeRisonUrlState<UrlInputsModel>(newUrlStateString);
    if (queryState != null && queryState.global != null) {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: updateTimerangeUrl(queryState, isInitializing),
        urlStateKey: urlKey,
      });
    }
  } else if (urlKey === CONSTANTS.sourcerer) {
    const sourcererState = decodeRisonUrlState<SourcererScopePatterns>(newUrlStateString);
    if (sourcererState != null && Object.keys(sourcererState).length > 0) {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: sourcererState,
        urlStateKey: urlKey,
      });
    }
  } else if (urlKey === CONSTANTS.filters) {
    const queryState = decodeRisonUrlState<Filter[]>(newUrlStateString);
    if (isEmpty(queryState)) {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    }
  } else if (urlKey === CONSTANTS.timeline) {
    const queryState = decodeRisonUrlState<TimelineUrl>(newUrlStateString);
    if (queryState != null && queryState.id === '') {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    }
  }
  return search;
};

export const replaceStateInLocation = <T>({
  history,
  urlStateToReplace,
  urlStateKey,
  pathName,
  search,
}: ReplaceStateInLocation<T>) => {
  const newLocation = replaceQueryStringInLocation(
    {
      hash: '',
      pathname: pathName,
      search,
      state: '',
    },
    replaceStateKeyInQueryString(urlStateKey, urlStateToReplace)(getQueryStringFromLocation(search))
  );
  if (history) {
    newLocation.state = history.location.state;
    history.replace(newLocation);
  }
  return newLocation.search;
};
