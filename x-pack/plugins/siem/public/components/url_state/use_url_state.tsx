/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { throttle, get } from 'lodash/fp';
import React, { useState, useEffect, useRef } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import {
  hostsModel,
  hostsSelectors,
  inputsSelectors,
  networkModel,
  networkSelectors,
  State,
} from '../../store';
import { hostsActions, inputsActions, networkActions } from '../../store/actions';
import { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import {
  AbsoluteTimeRange,
  LinkTo,
  RelativeTimeRange,
  UrlInputsModel,
} from '../../store/inputs/model';

import { CONSTANTS } from './constants';
import {
  replaceQueryStringInLocation,
  getQueryStringFromLocation,
  replaceStateKeyInQueryString,
  getParamFromQueryString,
  getCurrentLocation,
  decodeRisonUrlState,
  isKqlForRoute,
} from './helpers';
import {
  UrlStateContainerPropTypes,
  UrlStateProps,
  KqlQueryObject,
  UrlState,
  PreviousLocationUrlState,
  URL_STATE_KEYS,
  KeyUrlState,
  LocationKeysType,
  LOCATION_KEYS,
  KqlQuery,
  LocationTypes,
  LOCATION_MAPPED_TO_MODEL,
} from './types';

function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const useUrlStateHooks = ({
  location,
  indexPattern,
  history,
  setAbsoluteTimerange,
  setHostsKql,
  setNetworkKql,
  setRelativeTimerange,
  toggleTimelineLinkTo,
  urlState,
}: UrlStateContainerPropTypes) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const prevProps = usePrevious({ location, urlState });

  const replaceStateInLocation = throttle(
    1000,
    (urlStateToReplace: UrlInputsModel | KqlQuery, urlStateKey: string) => {
      const newLocation = replaceQueryStringInLocation(
        location,
        replaceStateKeyInQueryString(urlStateKey, urlStateToReplace)(
          getQueryStringFromLocation(location)
        )
      );
      if (newLocation !== location) {
        history.replace(newLocation);
      }
    }
  );

  const handleInitialize = (initLocation: Location) => {
    URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(location),
        urlKey
      );
      if (newUrlStateString) {
        setInitialStateFromUrl(urlKey, newUrlStateString, location);
      } else {
        if (urlKey === CONSTANTS.timerange) {
          replaceStateInLocation(urlState[urlKey], urlKey);
        }
        if (urlKey === CONSTANTS.kqlQuery) {
          const currentLocation: LocationTypes = getCurrentLocation(location.pathname);
          if (currentLocation !== null) {
            replaceStateInLocation(urlState[CONSTANTS.kqlQuery][currentLocation], urlKey);
          }
        }
      }
    });
  };

  const setInitialStateFromUrl = (
    urlKey: KeyUrlState,
    newUrlStateString: string,
    newLocation: Location
  ) => {
    if (urlKey === CONSTANTS.timerange) {
      const timerangeStateData: UrlInputsModel = decodeRisonUrlState(newUrlStateString);
      const globalId: InputsModelId = 'global';
      const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', timerangeStateData) };
      const globalType: TimeRangeKinds = get('global.timerange.kind', timerangeStateData);
      if (globalType) {
        if (globalLinkTo.linkTo.length === 0) {
          toggleTimelineLinkTo({ linkToId: 'global' });
        }
        if (globalType === 'absolute') {
          const absoluteRange: AbsoluteTimeRange = get('global.timerange', timerangeStateData);
          setAbsoluteTimerange({
            ...absoluteRange,
            id: globalId,
          });
        }
        if (globalType === 'relative') {
          const relativeRange: RelativeTimeRange = get('global.timerange', timerangeStateData);
          setRelativeTimerange({
            ...relativeRange,
            id: globalId,
          });
        }
      }
      const timelineId: InputsModelId = 'timeline';
      const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', timerangeStateData) };
      const timelineType: TimeRangeKinds = get('timeline.timerange.kind', timerangeStateData);
      if (timelineType) {
        if (timelineLinkTo.linkTo.length === 0) {
          toggleTimelineLinkTo({ linkToId: 'timeline' });
        }
        if (timelineType === 'absolute') {
          const absoluteRange: AbsoluteTimeRange = get('timeline.timerange', timerangeStateData);
          setAbsoluteTimerange({
            ...absoluteRange,
            id: timelineId,
          });
        }
        if (timelineType === 'relative') {
          const relativeRange: RelativeTimeRange = get('timeline.timerange', timerangeStateData);
          setRelativeTimerange({
            ...relativeRange,
            id: timelineId,
          });
        }
      }
    }
    if (urlKey === CONSTANTS.kqlQuery) {
      const kqlQueryStateData: KqlQuery = decodeRisonUrlState(newUrlStateString);
      if (isKqlForRoute(location.pathname, kqlQueryStateData)) {
        const filterQuery = {
          kuery: kqlQueryStateData.filterQuery,
          serializedQuery: convertKueryToElasticSearchQuery(
            kqlQueryStateData.filterQuery ? kqlQueryStateData.filterQuery.expression : '',
            indexPattern
          ),
        };
        if (
          kqlQueryStateData.queryLocation === CONSTANTS.hostsPage ||
          kqlQueryStateData.queryLocation === CONSTANTS.hostsDetails
        ) {
          const hostsType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
          setHostsKql({
            filterQuery,
            hostsType,
          });
        }
        if (
          kqlQueryStateData.queryLocation === CONSTANTS.networkPage ||
          kqlQueryStateData.queryLocation === CONSTANTS.networkDetails
        ) {
          const networkType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
          setNetworkKql({
            filterQuery,
            networkType,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (isInitializing) {
      setIsInitializing(false);
      /*
       * Why are we doing that, it is because angular-ui router is encoding the `+` back to `2%0` after
       * that react router is getting the data with the `+` and convert to `2%B`
       * so we need to get back the value from the window location at initialization to avoid
       * to bring back the `+` in the kql
       */
      const substringIndex =
        window.location.href.indexOf(`#${location.pathname}`) + location.pathname.length + 1;
      location.search = window.location.href.substring(substringIndex);
      /* End of why */
      handleInitialize(location);
    } else if (JSON.stringify(urlState) !== JSON.stringify(prevProps.urlState)) {
      URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
        if (
          urlState[urlKey] &&
          JSON.stringify(urlState[urlKey]) !== JSON.stringify(prevProps.urlState[urlKey])
        ) {
          if (urlKey === CONSTANTS.kqlQuery) {
            LOCATION_KEYS.forEach((queryLocation: LocationKeysType) => {
              if (
                !!urlState[CONSTANTS.kqlQuery][queryLocation] &&
                JSON.stringify(urlState[CONSTANTS.kqlQuery][queryLocation]) !==
                  JSON.stringify(prevProps.urlState[CONSTANTS.kqlQuery][queryLocation])
              ) {
                replaceStateInLocation(
                  urlState[CONSTANTS.kqlQuery][queryLocation],
                  CONSTANTS.kqlQuery
                );
              }
            });
          } else {
            replaceStateInLocation(urlState[urlKey], urlKey);
          }
        }
      });
    } else if (location.pathname !== prevProps.location.pathname) {
      handleInitialize(location);
    }
  });

  return { isInitializing };
};

const UrlStateContainer = (props: UrlStateContainerPropTypes) => {
  const { isInitializing } = useUrlStateHooks(props);
  return props.children({ isInitializing });
};

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getHostsFilterQueryAsKuery = hostsSelectors.hostsFilterQueryAsKuery();
  const getNetworkFilterQueryAsKuery = networkSelectors.networkFilterQueryAsKuery();
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

    const kqlQueryInitialState: KqlQueryObject = {
      [CONSTANTS.hostsDetails]: {
        filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.details),
        queryLocation: CONSTANTS.hostsDetails,
        type: hostsModel.HostsType.details,
      },
      [CONSTANTS.hostsPage]: {
        filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.page),
        queryLocation: CONSTANTS.hostsPage,
        type: hostsModel.HostsType.page,
      },
      [CONSTANTS.networkDetails]: {
        filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.details),
        queryLocation: CONSTANTS.networkDetails,
        type: networkModel.NetworkType.details,
      },
      [CONSTANTS.networkPage]: {
        filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.page),
        queryLocation: CONSTANTS.networkPage,
        type: networkModel.NetworkType.page,
      },
    };

    return {
      urlState: {
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
        [CONSTANTS.kqlQuery]: kqlQueryInitialState,
      },
    };
  };

  return mapStateToProps;
};

export const UseUrlState = compose<React.ComponentClass<UrlStateProps>>(
  withRouter,
  connect(
    makeMapStateToProps,
    {
      setAbsoluteTimerange: inputsActions.setAbsoluteRangeDatePicker,
      setHostsKql: hostsActions.applyHostsFilterQuery,
      setNetworkKql: networkActions.applyNetworkFilterQuery,
      setRelativeTimerange: inputsActions.setRelativeRangeDatePicker,
      toggleTimelineLinkTo: inputsActions.toggleTimelineLinkTo,
    }
  )
)(UrlStateContainer);
