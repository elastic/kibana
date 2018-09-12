/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import throttle from 'lodash/fp/throttle';
import { parse as parseQueryString, stringify as stringifyQueryString } from 'querystring';
import React from 'react';
import { Route, RouteProps } from 'react-router';
import { decode, encode, RisonValue } from 'rison-node';

interface UrlStateContainerProps<UrlState> {
  urlState: UrlState | undefined;
  urlStateKey: string;
  mapToUrlState?: (value: any) => UrlState | undefined;
  onChange?: (urlState: UrlState, previousUrlState: UrlState | undefined) => void;
  onInitialize?: (urlState: UrlState | undefined) => void;
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

  // tslint:disable-next-line:member-ordering this is really a method despite what tslint thinks
  private replaceStateInLocation = throttle(1000, (urlState: UrlState | undefined) => {
    const { history, location, urlStateKey } = this.props;

    const newLocation = updateLocationWithUrlState(urlStateKey, urlState, this.props.location);

    if (newLocation !== location) {
      history.replace(newLocation);
    }
  });

  private handleInitialize = (location: Location) => {
    const { onInitialize, mapToUrlState, urlStateKey } = this.props;

    if (!onInitialize || !mapToUrlState) {
      return;
    }

    const newQueryValue = parseLocation(location)[urlStateKey];
    const newUrlStateString = Array.isArray(newQueryValue) ? newQueryValue[0] : newQueryValue;
    const newUrlState = mapToUrlState(decodeRisonUrlState(newUrlStateString));

    onInitialize(newUrlState);
  };

  private handleLocationChange = (prevLocation: Location, newLocation: Location) => {
    const { onChange, mapToUrlState, urlStateKey } = this.props;

    if (!onChange || !mapToUrlState) {
      return;
    }

    const previousQueryValue = parseLocation(prevLocation)[urlStateKey];
    const newQueryValue = parseLocation(newLocation)[urlStateKey];

    const previousUrlStateString = Array.isArray(previousQueryValue)
      ? previousQueryValue[0]
      : previousQueryValue;
    const newUrlStateString = Array.isArray(newQueryValue) ? newQueryValue[0] : newQueryValue;

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

const decodeRisonUrlState = (value: string): RisonValue | undefined => {
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

const parseLocation = (location: Location) => parseQueryString(location.search.substring(1));

const updateLocationWithUrlState = <UrlState extends any>(
  stateKey: string,
  urlState: UrlState | undefined,
  location: Location
): Location => {
  const previousQueryValues = parseLocation(location);
  const encodedUrlState =
    typeof urlState !== 'undefined' ? encodeRisonUrlState(urlState) : undefined;
  const newQueryString = stringifyQueryString({
    ...previousQueryValues,
    [stateKey]: encodedUrlState,
  });

  if (newQueryString === location.search.substring(1)) {
    return location;
  } else {
    return {
      ...location,
      search: `?${newQueryString}`,
    };
  }
};
