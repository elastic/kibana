/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import { get, throttle } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import { connect } from 'react-redux';
import { Route, RouteProps } from 'react-router-dom';

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
  AbsoluteUrlTimeRange,
  InputsModelId,
  RelativeUrlTimeRange,
  TimeRangeKinds,
  UrlInputsModel,
  UrlTimeRange,
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
import {
  KeyUrlState,
  KqlQuery,
  UrlStateContainerLifecycleProps,
  UrlStateContainerProps,
  UrlStateMappedToActionsType,
} from './types';

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
        if (JSON.stringify(urlState[urlKey]) !== JSON.stringify(prevUrlState[urlKey])) {
          if (urlKey === CONSTANTS.kqlQuery) {
            urlState[CONSTANTS.kqlQuery].forEach((value: KqlQuery, index: number) => {
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

  private urlStateMappedToActions: UrlStateMappedToActionsType = {
    [CONSTANTS.kqlQuery]: {
      hosts: this.props.setHostsKql,
      network: this.props.setNetworkKql,
    },
    [CONSTANTS.timerange]: {
      absolute: this.props.setAbsoluteTimerange,
      relative: this.props.setRelativeTimerange,
    },
  };

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
          const globalRange: UrlTimeRange = timerangeStateData.global;
          const globalType: TimeRangeKinds = get('global.kind', timerangeStateData);
          if (globalType) {
            if (globalRange.linkTo.length === 0) {
              this.props.toggleTimelineLinkTo({ linkToId: 'global' });
            }
            if (globalType === 'absolute') {
              const absoluteRange: AbsoluteUrlTimeRange = get('global.kind', timerangeStateData);
              this.urlStateMappedToActions.timerange[globalType]({
                ...absoluteRange,
                id: globalId,
              });
            }
            if (globalType === 'relative') {
              const relativeRange: RelativeUrlTimeRange = get('global.kind', timerangeStateData);
              this.urlStateMappedToActions.timerange[globalType]({
                ...relativeRange,
                id: globalId,
              });
            }
          }
          const timelineId: InputsModelId = 'timeline';
          const timelineRange: UrlTimeRange = timerangeStateData.timeline;
          const timelineType: TimeRangeKinds = get('timeline.kind', timerangeStateData);
          if (timelineType) {
            if (timelineRange.linkTo.length === 0) {
              this.props.toggleTimelineLinkTo({ linkToId: 'timeline' });
            }
            if (timelineType === 'absolute') {
              const absoluteRange: AbsoluteUrlTimeRange = get('timeline.kind', timerangeStateData);
              this.urlStateMappedToActions.timerange[timelineType]({
                ...absoluteRange,
                id: timelineId,
              });
            }
            if (timelineType === 'relative') {
              const relativeRange: RelativeUrlTimeRange = get('timeline.kind', timerangeStateData);
              this.urlStateMappedToActions.timerange[timelineType]({
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
              this.urlStateMappedToActions[CONSTANTS.kqlQuery].hosts({
                filterQuery,
                hostsType: kqlQueryStateData.type,
              });
            }
            if (kqlQueryStateData.model === 'network') {
              this.urlStateMappedToActions[CONSTANTS.kqlQuery].network({
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
    // debugger;
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

    console.log('decodeRisonUrlState(newUrlStateString)', decodeRisonUrlState(newUrlStateString));
    console.log('typeof', typeof decodeRisonUrlState(newUrlStateString));

    if (previousUrlStateString !== newUrlStateString) {
      const previousUrlState = mapToUrlState(decodeRisonUrlState(previousUrlStateString));
      const newUrlState = mapToUrlState(decodeRisonUrlState(newUrlStateString));
      // debugger;
      if (typeof newUrlState !== 'undefined') {
        onChange(newUrlState, previousUrlState);
      }
    }
  };
}

export const UrlStateComponents = pure<UrlStateContainerProps>(props => (
  <Route<RouteProps>>
    {({ history, location }) => (
      <UrlStateContainerLifecycle
        data-test-subj={'urlStateComponents'}
        history={history}
        location={location}
        {...props}
      />
    )}
  </Route>
));

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getHostsFilterQueryAsKuery = hostsSelectors.hostsFilterQueryAsKuery();
  const getNetworkFilterQueryAsKuery = networkSelectors.networkFilterQueryAsKuery();
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, [CONSTANTS.timerange]: globalTimerange } = inputState.global;
    const {
      linkTo: timelineLinkTo,
      [CONSTANTS.timerange]: timelineTimerange,
    } = inputState.timeline;

    return {
      urlState: {
        [CONSTANTS.timerange]: {
          global: {
            [CONSTANTS.timerange]: globalTimerange,
            linkTo: globalLinkTo,
          },
          timeline: {
            [CONSTANTS.timerange]: timelineLinkTo,
            linkTo: timelineTimerange,
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
)(UrlStateComponents);
