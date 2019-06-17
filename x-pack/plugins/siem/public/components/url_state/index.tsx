/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { get, throttle } from 'lodash/fp';
import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { hostsActions, inputsActions, networkActions } from '../../store/actions';
import {
  hostsModel,
  hostsSelectors,
  inputsSelectors,
  networkModel,
  networkSelectors,
  State,
} from '../../store';
import {
  AbsoluteTimeRange,
  LinkTo,
  RelativeTimeRange,
  UrlInputsModel,
} from '../../store/inputs/model';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { URL_STATE_KEYS, LOCATION_MAPPED_TO_MODEL, LOCATION_KEYS } from './types';
import {
  decodeRisonUrlState,
  getCurrentLocation,
  getParamFromQueryString,
  getQueryStringFromLocation,
  isKqlForRoute,
  replaceQueryStringInLocation,
  replaceStateKeyInQueryString,
} from './helpers';
import {
  KeyUrlState,
  KqlQuery,
  KqlQueryObject,
  LocationKeysType,
  LocationTypes,
  UrlStateContainerPropTypes,
  UrlStateProps,
} from './types';
import { CONSTANTS } from './constants';
import { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';

export class UrlStateContainerLifecycle extends React.Component<UrlStateContainerPropTypes> {
  public render() {
    return null;
  }

  public componentDidUpdate({
    location: prevLocation,
    urlState: prevUrlState,
  }: UrlStateContainerPropTypes) {
    const { location, urlState } = this.props;

    if (JSON.stringify(urlState) !== JSON.stringify(prevUrlState)) {
      URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
        if (
          urlState[urlKey] &&
          JSON.stringify(urlState[urlKey]) !== JSON.stringify(prevUrlState[urlKey])
        ) {
          if (urlKey === CONSTANTS.kqlQuery) {
            LOCATION_KEYS.forEach((queryLocation: LocationKeysType) => {
              if (
                !!urlState[CONSTANTS.kqlQuery][queryLocation] &&
                JSON.stringify(urlState[CONSTANTS.kqlQuery][queryLocation]) !==
                  JSON.stringify(prevUrlState[CONSTANTS.kqlQuery][queryLocation])
              ) {
                this.replaceStateInLocation(
                  urlState[CONSTANTS.kqlQuery][queryLocation],
                  CONSTANTS.kqlQuery
                );
              }
            });
          } else {
            this.replaceStateInLocation(urlState[urlKey], urlKey);
          }
        }
      });
    } else if (location.pathname !== prevLocation.pathname) {
      this.handleInitialize(location);
    }
  }

  public componentWillMount() {
    const { location } = this.props;
    this.handleInitialize(location);
  }

  private replaceStateInLocation = throttle(
    1000,
    (urlState: UrlInputsModel | KqlQuery, urlStateKey: string) => {
      const { history, location } = this.props;
      const newLocation = replaceQueryStringInLocation(
        location,
        replaceStateKeyInQueryString(urlStateKey, urlState)(getQueryStringFromLocation(location))
      );
      if (newLocation !== location) {
        history.replace(newLocation);
      }
    }
  );

  private setInitialStateFromUrl = (
    urlKey: KeyUrlState,
    newUrlStateString: string,
    location: Location
  ) => {
    if (urlKey === CONSTANTS.timerange) {
      const timerangeStateData: UrlInputsModel = decodeRisonUrlState(newUrlStateString);
      const globalId: InputsModelId = 'global';
      const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', timerangeStateData) };
      const globalType: TimeRangeKinds = get('global.timerange.kind', timerangeStateData);
      if (globalType) {
        if (globalLinkTo.linkTo.length === 0) {
          this.props.toggleTimelineLinkTo({ linkToId: 'global' });
        }
        if (globalType === 'absolute') {
          const absoluteRange: AbsoluteTimeRange = get('global.timerange', timerangeStateData);
          this.props.setAbsoluteTimerange({
            ...absoluteRange,
            id: globalId,
          });
        }
        if (globalType === 'relative') {
          const relativeRange: RelativeTimeRange = get('global.timerange', timerangeStateData);
          this.props.setRelativeTimerange({
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
          this.props.toggleTimelineLinkTo({ linkToId: 'timeline' });
        }
        if (timelineType === 'absolute') {
          const absoluteRange: AbsoluteTimeRange = get('timeline.timerange', timerangeStateData);
          this.props.setAbsoluteTimerange({
            ...absoluteRange,
            id: timelineId,
          });
        }
        if (timelineType === 'relative') {
          const relativeRange: RelativeTimeRange = get('timeline.timerange', timerangeStateData);
          this.props.setRelativeTimerange({
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
            this.props.indexPattern
          ),
        };
        if (
          kqlQueryStateData.queryLocation === CONSTANTS.hostsPage ||
          kqlQueryStateData.queryLocation === CONSTANTS.hostsDetails
        ) {
          const hostsType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
          this.props.setHostsKql({
            filterQuery,
            hostsType,
          });
        }
        if (
          kqlQueryStateData.queryLocation === CONSTANTS.networkPage ||
          kqlQueryStateData.queryLocation === CONSTANTS.networkDetails
        ) {
          const networkType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
          this.props.setNetworkKql({
            filterQuery,
            networkType,
          });
        }
      }
    }
  };

  private handleInitialize = (location: Location) => {
    URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(location),
        urlKey
      );
      if (newUrlStateString) {
        this.setInitialStateFromUrl(urlKey, newUrlStateString, location);
      } else {
        if (urlKey === CONSTANTS.timerange) {
          this.replaceStateInLocation(this.props.urlState[urlKey], urlKey);
        }
        if (urlKey === CONSTANTS.kqlQuery) {
          const currentLocation: LocationTypes = getCurrentLocation(location.pathname);
          if (currentLocation !== null) {
            this.replaceStateInLocation(
              this.props.urlState[CONSTANTS.kqlQuery][currentLocation],
              urlKey
            );
          }
        }
      }
    });
  };
}

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

export const UrlStateContainer = compose<React.ComponentClass<UrlStateProps>>(
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
)(UrlStateContainerLifecycle);
