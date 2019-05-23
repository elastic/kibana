/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { get, throttle } from 'lodash/fp';
import React from 'react';
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
  InputsModelId,
  LinkTo,
  RelativeTimeRange,
  TimeRangeKinds,
  UrlInputsModel,
} from '../../store/inputs/model';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { URL_STATE_KEYS, CONSTANTS, LOCATION_MAPPED_TO_MODEL } from './constants';
import {
  decodeRisonUrlState,
  getQueryStringFromLocation,
  getParamFromQueryString,
  replaceStateKeyInQueryString,
  replaceQueryStringInLocation,
  isKqlForRoute,
  getCurrentLocation,
} from './helpers';
import {
  KeyUrlState,
  KqlQuery,
  UrlStateContainerPropTypes,
  LocationMappedToModel,
  LocationTypes,
  KeyKqlQueryObject,
} from './types';



export class UrlStateContainerLifecycle extends React.Component<UrlStateContainerPropTypes> {
  public render() {
    return null;
  }

  public componentDidUpdate({
    location: prevLocation,
    urlState: prevUrlState,
  }: UrlStateContainerPropTypes) {
    const { urlState } = this.props;
    if (JSON.stringify(urlState) !== JSON.stringify(prevUrlState)) {
      URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
        if (
          urlState[urlKey] &&
          JSON.stringify(urlState[urlKey]) !== JSON.stringify(prevUrlState[urlKey])
        ) {
          if (urlKey === CONSTANTS.kqlQuery) {
            console.log('LOCATION_MAPPED_TO_MODEL', LOCATION_MAPPED_TO_MODEL);
            Object.keys(LOCATION_MAPPED_TO_MODEL).forEach((index: string) => {
              const queryKey: LocationTypes = index;
              if (queryKey !== null) {
                const value = urlState[urlKey][queryKey];
              }
              if (
                index !== null &&
                JSON.stringify(urlState[CONSTANTS.kqlQuery][index]) !==
                  JSON.stringify(prevUrlState[CONSTANTS.kqlQuery][index])
              ) {
                this.replaceStateInLocation(
                  urlState[CONSTANTS.kqlQuery][index],
                  CONSTANTS.kqlQuery
                );
              }
            });
          } else {
            this.replaceStateInLocation(urlState[urlKey], urlKey);
          }
        }
      });
    }
  }

  public componentDidMount() {
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

  private handleInitialize = (location: Location) => {
    console.log('location', location);
    URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(location),
        urlKey
      );
      if (newUrlStateString) {
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
              const absoluteRange: AbsoluteTimeRange = get(
                'timeline.timerange',
                timerangeStateData
              );
              this.props.setAbsoluteTimerange({
                ...absoluteRange,
                id: timelineId,
              });
            }
            if (timelineType === 'relative') {
              const relativeRange: RelativeTimeRange = get(
                'timeline.timerange',
                timerangeStateData
              );
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
              kqlQueryStateData.queryLocation === (CONSTANTS.hostsPage || CONSTANTS.hostsDetails)
            ) {
              const hostsType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
              this.props.setHostsKql({
                filterQuery,
                hostsType,
              });
            }
            if (
              kqlQueryStateData.queryLocation ===
              (CONSTANTS.networkPage || CONSTANTS.networkDetails)
            ) {
              const networkType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
              this.props.setNetworkKql({
                filterQuery,
                networkType,
              });
            }
          }
        }
      } else {
        if (urlKey === CONSTANTS.timerange) {
          this.replaceStateInLocation(this.props.urlState[urlKey], urlKey);
        }
        if (urlKey === CONSTANTS.kqlQuery) {
          const currentLocation: LocationTypes = getCurrentLocation(location.pathname);
          if (currentLocation !== null) {
            this.replaceStateInLocation(this.props.urlState[urlKey][currentLocation], urlKey);
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
        [CONSTANTS.kqlQuery]: {
          [CONSTANTS.hostsDetails]: {
            filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.details),
            queryLocation: CONSTANTS.hostsDetails,
          },
          [CONSTANTS.hostsPage]: {
            filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.page),
            queryLocation: CONSTANTS.hostsPage,
          },
          [CONSTANTS.networkDetails]: {
            filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.details),
            queryLocation: CONSTANTS.networkDetails,
          },
          [CONSTANTS.networkPage]: {
            filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.page),
            queryLocation: CONSTANTS.networkPage,
          },
        },
      },
    };
  };

  return mapStateToProps;
};
export const UrlStateContainer = connect(
  makeMapStateToProps,
  {
    setAbsoluteTimerange: inputsActions.setAbsoluteRangeDatePicker,
    setHostsKql: hostsActions.applyHostsFilterQuery,
    setNetworkKql: networkActions.applyNetworkFilterQuery,
    setRelativeTimerange: inputsActions.setRelativeRangeDatePicker,
    toggleTimelineLinkTo: inputsActions.toggleTimelineLinkTo,
  }
  // @ts-ignore
)(withRouter(UrlStateContainerLifecycle)) as typeof UrlStateContainerPropTypes;
