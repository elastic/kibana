/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'query-string';
import { History, Location } from 'history';
import { throttle } from 'lodash';
import React from 'react';
import { Route, RouteProps } from 'react-router-dom';
import { decode, encode, RisonValue } from 'rison-node';
import { url } from '@kbn/kibana-utils-plugin/public';

interface UrlStateContainerProps<UrlState> {
  urlState: UrlState | undefined;
  urlStateKey: string;
  mapToUrlState?: (value: any) => UrlState | undefined;
  onChange?: (urlState: UrlState, previousUrlState: UrlState | undefined) => void;
  onInitialize?: (urlState: UrlState | undefined) => void;
  populateWithInitialState?: boolean;
}

interface UrlStateContainerLifecycleProps<UrlState> extends UrlStateContainerProps<UrlState> {
  location: Location;
  history: History;
}

class UrlStateContainerLifecycle<UrlState> extends React.Component<
  UrlStateContainerLifecycleProps<UrlState>
> {
  public render() {
    return null;
  }

  public componentDidUpdate({
    location: prevLocation,
    urlState: prevUrlState,
  }: UrlStateContainerLifecycleProps<UrlState>) {
    const { history, location, urlState } = this.props;

    if (urlState !== prevUrlState) {
      this.replaceStateInLocation(urlState);
    }

    if (history.action === 'POP' && location !== prevLocation) {
      this.handleLocationChange(prevLocation, location);
    }
  }

  public componentDidMount() {
    const { location } = this.props;

    this.handleInitialize(location);
  }

  private replaceStateInLocation = throttle((urlState: UrlState | undefined) => {
    const { history, location, urlStateKey } = this.props;

    const newLocation = replaceQueryStringInLocation(
      location,
      replaceStateKeyInQueryString(urlStateKey, urlState)(getQueryStringFromLocation(location))
    );

    if (newLocation !== location) {
      history.replace(newLocation);
    }
  }, 1000);

  private handleInitialize = (location: Location) => {
    const { onInitialize, mapToUrlState, urlStateKey, urlState } = this.props;

    if (!onInitialize || !mapToUrlState) {
      return;
    }

    const newUrlStateString = getParamFromQueryString(
      getQueryStringFromLocation(location),
      urlStateKey
    );
    const newUrlState = mapToUrlState(decodeRisonUrlState(newUrlStateString));

    // When the newURLState is empty we can assume that the state will becoming
    // from the urlState initially. By setting populateWithIntialState to true
    // this will now serialize the initial urlState into the URL when the page is
    // loaded.
    if (!newUrlState && this.props.populateWithInitialState) {
      this.replaceStateInLocation(urlState);
      onInitialize(urlState);
    } else {
      onInitialize(newUrlState);
    }
  };

  private handleLocationChange = (prevLocation: Location, newLocation: Location) => {
    const { onChange, mapToUrlState, urlStateKey } = this.props;

    if (!onChange || !mapToUrlState) {
      return;
    }

    const previousUrlStateString = getParamFromQueryString(
      getQueryStringFromLocation(prevLocation),
      urlStateKey
    );
    const newUrlStateString = getParamFromQueryString(
      getQueryStringFromLocation(newLocation),
      urlStateKey
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

export const UrlStateContainer = <UrlState extends any>(
  props: UrlStateContainerProps<UrlState>
) => (
  <Route<RouteProps>>
    {({ history, location }) => (
      <UrlStateContainerLifecycle<UrlState> history={history} location={location} {...props} />
    )}
  </Route>
);

export const decodeRisonUrlState = (value: string | undefined): RisonValue | undefined => {
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
  const parsedQueryString: Record<string, any> = parse(queryString, { sort: false });
  const queryParam = parsedQueryString[key];

  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

export const replaceStateKeyInQueryString =
  <UrlState extends any>(stateKey: string, urlState: UrlState | undefined) =>
  (queryString: string) => {
    const previousQueryValues = parse(queryString, { sort: false });
    const newValue =
      typeof urlState === 'undefined'
        ? previousQueryValues
        : {
            ...previousQueryValues,
            [stateKey]: encodeRisonUrlState(urlState),
          };
    return stringify(url.encodeQuery(newValue), { sort: false, encode: false });
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
