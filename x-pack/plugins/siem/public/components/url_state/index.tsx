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
import { decode, encode, RisonValue } from 'rison-node';

import { QueryString } from 'ui/utils/query_string';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';
import { inputsActions, hostsActions, networkActions } from '../../store/actions';
import {
  hostsModel,
  hostsSelectors,
  inputsSelectors,
  KueryFilterQuery,
  networkModel,
  networkSelectors,
  SerializedFilterQuery,
  State,
} from '../../store';
import {
  InputsModelId,
  TimeRangeKinds,
  UrlInputsModel,
  UrlTimeRange,
} from '../../store/inputs/model';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';

interface KqlQueryHosts {
  filterQuery: KueryFilterQuery;
  type: hostsModel.HostsType;
  model: 'hosts';
}

interface KqlQueryNetwork {
  filterQuery: KueryFilterQuery;
  type: networkModel.NetworkType;
  model: 'network';
}

type KqlQuery = KqlQueryHosts | KqlQueryNetwork;

interface UrlState {
  timerange: UrlInputsModel;
  kqlQuery: KqlQuery[];
  [key: string]: any;
}

interface UrlStateProps {
  indexPattern: StaticIndexPattern;
  mapToUrlState?: (value: any) => UrlState | undefined;
  onChange?: (urlState: UrlState, previousUrlState: UrlState | undefined) => void;
  onInitialize?: (urlState: UrlState | undefined) => void;
  urlState: UrlState;
}

interface UrlStateDispatchProps {
  setHostsKql: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    hostsType: hostsModel.HostsType;
  }>;
  setNetworkKql: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    networkType: networkModel.NetworkType;
  }>;
  setAbsoluteTimerange: ActionCreator<{
    from: number;
    fromStr: undefined;
    id: InputsModelId;
    to: number;
    toStr: undefined;
  }>;
  setRelativeTimerange: ActionCreator<{
    from: number;
    fromStr: string;
    id: InputsModelId;
    to: number;
    toStr: string;
  }>;
  toggleTimelineLinkTo: ActionCreator<{
    linkToId: InputsModelId;
  }>;
}

type UrlStateContainerProps = UrlStateProps & UrlStateDispatchProps;

interface UrlStateContainerLifecycles {
  history: History;
  location: Location;
}
type UrlStateContainerLifecycleProps = UrlStateContainerLifecycles & UrlStateContainerProps;

export const isKqlForRoute = (pathname: string, kql: KqlQuery): boolean => {
  const trailingPath = pathname.match(/([^\/]+$)/);
  if (trailingPath !== null) {
    if (
      trailingPath[0] === 'hosts' &&
      kql.model === 'hosts' &&
      kql.type === hostsModel.HostsType.page
    ) {
      return true;
    }
    if (
      trailingPath[0] === 'network' &&
      kql.model === 'network' &&
      kql.type === networkModel.NetworkType.page
    ) {
      return true;
    }
    if (
      pathname.match(/hosts\/.*?/) &&
      kql.model === 'hosts' &&
      kql.type === hostsModel.HostsType.details
    ) {
      return true;
    }
    if (
      pathname.match(/network\/ip\/.*?/) &&
      kql.model === 'network' &&
      kql.type === networkModel.NetworkType.details
    ) {
      return true;
    }
  }
  return false;
};

class UrlStateContainerLifecycle extends React.Component<UrlStateContainerLifecycleProps> {
  public readonly state = {
    kqlQuery: '',
  };

  public render() {
    return null;
  }

  public componentDidUpdate({
    location: prevLocation,
    urlState: prevUrlState,
  }: UrlStateContainerLifecycleProps) {
    const { history, location, urlState } = this.props;
    if (JSON.stringify(urlState) !== JSON.stringify(prevUrlState)) {
      Object.keys(urlState).forEach((urlKey: string) => {
        if (JSON.stringify(urlState[urlKey]) !== JSON.stringify(prevUrlState[urlKey])) {
          if (urlKey === 'kqlQuery') {
            urlState.kqlQuery.forEach((value: KqlQuery, index: number) => {
              if (
                JSON.stringify(urlState.kqlQuery[index]) !==
                JSON.stringify(prevUrlState.kqlQuery[index])
              ) {
                this.replaceStateInLocation(urlState.kqlQuery[index], 'kqlQuery');
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

  // eslint-disable-next-line @typescript-eslint/member-ordering this is really a method despite what eslint thinks
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

  private urlStateMappedToActions = {
    timerange: {
      absolute: this.props.setAbsoluteTimerange,
      relative: this.props.setRelativeTimerange,
    },
    kqlQuery: {
      hosts: this.props.setHostsKql,
      network: this.props.setNetworkKql,
    },
  };

  private handleInitialize = (location: Location) => {
    Object.keys(this.urlStateMappedToActions).map(key => {
      const newUrlStateString = getParamFromQueryString(getQueryStringFromLocation(location), key);
      if (newUrlStateString) {
        switch (key) {
          case 'timerange':
            const timerangeStateData: UrlInputsModel = decodeRisonUrlState(newUrlStateString);
            const globalId: InputsModelId = 'global';
            const globalRange: UrlTimeRange = timerangeStateData.global;
            const globalType: TimeRangeKinds = get('global.kind', timerangeStateData);
            if (globalType) {
              if (globalRange.linkTo.length === 0) {
                this.props.toggleTimelineLinkTo({ linkToId: 'global' });
              }
              // @ts-ignore
              this.urlStateMappedToActions.timerange[globalType]({
                ...globalRange,
                id: globalId,
              });
            }
            const timelineId: InputsModelId = 'timeline';
            const timelineRange: UrlTimeRange = timerangeStateData.timeline;
            const timelineType: TimeRangeKinds = get('timeline.kind', timerangeStateData);
            if (timelineType) {
              if (timelineRange.linkTo.length === 0) {
                this.props.toggleTimelineLinkTo({ linkToId: 'timeline' });
              }
              // @ts-ignore
              this.urlStateMappedToActions.timerange[timelineType]({
                ...timelineRange,
                id: timelineId,
              });
            }
            return;
          case 'kqlQuery':
            const kqlQueryStateData: KqlQuery = decodeRisonUrlState(newUrlStateString);
            if (isKqlForRoute(location.pathname, kqlQueryStateData)) {
              const filterQuery = {
                query: kqlQueryStateData.filterQuery,
                serializedQuery: convertKueryToElasticSearchQuery(
                  kqlQueryStateData.filterQuery.expression,
                  this.props.indexPattern
                ),
              };
              if (kqlQueryStateData.model === 'hosts') {
                this.urlStateMappedToActions.kqlQuery.hosts({
                  filterQuery,
                  hostsType: kqlQueryStateData.type,
                });
              }
              if (kqlQueryStateData.model === 'network') {
                this.urlStateMappedToActions.kqlQuery.network({
                  filterQuery,
                  networkType: kqlQueryStateData.type,
                });
              }
            }
        }
        return;
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

export const UrlStateComponents = pure<UrlStateContainerProps>(props => (
  <Route<RouteProps>>
    {({ history, location }) => (
      <UrlStateContainerLifecycle history={history} location={location} {...props} />
    )}
  </Route>
));

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getHostsFilterQueryAsKuery = hostsSelectors.hostsFilterQueryAsKuery();
  const getNetworkFilterQueryAsKuery = networkSelectors.networkFilterQueryAsKuery();
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    return {
      urlState: {
        timerange: inputState
          ? {
              global: {
                ...get('global.timerange', inputState),
                linkTo: get('global.linkTo', inputState),
              },
              timeline: {
                ...get('timeline.timerange', inputState),
                linkTo: get('timeline.linkTo', inputState),
              },
            }
          : {},
        kqlQuery: [
          {
            filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.details) || '',
            type: hostsModel.HostsType.details,
            model: 'hosts',
          },
          {
            filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.page) || '',
            type: hostsModel.HostsType.page,
            model: 'hosts',
          },
          {
            filterQuery:
              getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.details) || '',
            type: networkModel.NetworkType.details,
            model: 'network',
          },
          {
            filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.page) || '',
            type: networkModel.NetworkType.page,
            model: 'network',
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
    setRelativeTimerange: inputsActions.setRelativeRangeDatePicker,
    setNetworkKql: networkActions.applyNetworkFilterQuery,
    setHostsKql: hostsActions.applyHostsFilterQuery,
    toggleTimelineLinkTo: inputsActions.toggleTimelineLinkTo,
  }
  // @ts-ignore
)(UrlStateComponents);

export const decodeRisonUrlState = (value: string | undefined): RisonValue | any | undefined => {
  try {
    return value ? decode(value) : undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

const encodeRisonUrlState = (state: any) => encode(state);

export const getQueryStringFromLocation = (location: Location) => location.search.substring(1);

export const getParamFromQueryString = (queryString: string, key: string): string | undefined => {
  const queryParam = QueryString.decode(queryString)[key];
  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

export const replaceStateKeyInQueryString = <UrlState extends any>(
  stateKey: string,
  urlState: UrlState | undefined
) => (queryString: string) => {
  const previousQueryValues = QueryString.decode(queryString);
  const encodedUrlState =
    typeof urlState !== 'undefined' ? encodeRisonUrlState(urlState) : undefined;
  return QueryString.encode({
    ...previousQueryValues,
    [stateKey]: encodedUrlState,
  });
};

const replaceQueryStringInLocation = (location: Location, queryString: string): Location => {
  if (queryString === getQueryStringFromLocation(location)) {
    return location;
  } else {
    return {
      ...location,
      search: `?${queryString}`,
    };
  }
};
