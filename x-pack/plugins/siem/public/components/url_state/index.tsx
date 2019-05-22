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
  KueryFilterModel,
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
import { URL_STATE_KEYS, CONSTANTS } from './constants';
import {
  decodeRisonUrlState,
  getQueryStringFromLocation,
  getParamFromQueryString,
  replaceStateKeyInQueryString,
  replaceQueryStringInLocation,
  isKqlForRoute,
} from './helpers';
import { KeyUrlState, KqlQuery, UrlStateContainerLifecycleProps } from './types';

export class UrlStateContainerLifecycle extends React.Component<UrlStateContainerLifecycleProps> {
  public render() {
    return null;
  }

  public componentDidUpdate({
    location: prevLocation,
    urlState: prevUrlState,
  }: UrlStateContainerLifecycleProps) {
    const { history, location, urlState } = this.props;
    if (JSON.stringify(urlState) !== JSON.stringify(prevUrlState)) {
      URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
        if (
          urlState[urlKey] &&
          JSON.stringify(urlState[urlKey]) !== JSON.stringify(prevUrlState[urlKey])
        ) {
          if (urlKey === CONSTANTS.kqlQuery) {
            urlState[urlKey].forEach((value: KqlQuery, index: number) => {
              if (
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

    if (history.action === 'POP' && location !== prevLocation) {
      this.handleLocationChange(prevLocation, location);
    }
  }

  public componentDidMount() {
    const { location } = this.props;
    this.handleInitialize(location);
  }

  private replaceStateInLocation = throttle(
    1000,
    (urlState: UrlInputsModel | KqlQuery | KqlQuery[], urlStateKey: string) => {
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
            if (kqlQueryStateData.model === 'hosts') {
              this.props.setHostsKql({
                filterQuery,
                hostsType: kqlQueryStateData.type,
              });
            }
            if (kqlQueryStateData.model === 'network') {
              this.props.setNetworkKql({
                filterQuery,
                networkType: kqlQueryStateData.type,
              });
            }
          }
        }
      } else {
        this.replaceStateInLocation(this.props.urlState[urlKey], urlKey);
      }
    });
  };

  private handleLocationChange = (prevLocation: Location, newLocation: Location) => {
    const { onChange, mapToUrlState } = this.props;
    if (!onChange || !mapToUrlState) {
      return;
    }

    const previousUrlStateString = getParamFromQueryString(
      getQueryStringFromLocation(prevLocation),
      'urlStateKey'
    );
    const newUrlStateString = getParamFromQueryString(
      getQueryStringFromLocation(newLocation),
      'urlStateKey'
    );

    if (previousUrlStateString !== newUrlStateString) {
      const previousUrlState = mapToUrlState(decodeRisonUrlState(previousUrlStateString));
      const newUrlState = mapToUrlState(decodeRisonUrlState(newUrlStateString));
      if (typeof newUrlState !== 'undefined') {
        onChange(newUrlState, previousUrlState);
      }
    }
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
        [CONSTANTS.kqlQuery]: [
          {
            filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.details),
            type: hostsModel.HostsType.details,
            model: KueryFilterModel.hosts,
          },
          {
            filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.page),
            type: hostsModel.HostsType.page,
            model: KueryFilterModel.hosts,
          },
          {
            filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.details),
            type: networkModel.NetworkType.details,
            model: KueryFilterModel.network,
          },
          {
            filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.page),
            type: networkModel.NetworkType.page,
            model: KueryFilterModel.network,
          },
        ],
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
)(withRouter(UrlStateContainerLifecycle));
