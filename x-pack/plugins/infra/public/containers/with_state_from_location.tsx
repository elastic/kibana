/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'query-string';
import { Location } from 'history';
import { omit } from 'lodash';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/camelcase
import { decode_object, encode_object } from 'rison-node';
import { Omit } from '../lib/lib';

interface AnyObject {
  [key: string]: any;
}

interface WithStateFromLocationOptions<StateInLocation> {
  mapLocationToState: (location: Location) => StateInLocation;
  mapStateToLocation: (state: StateInLocation, location: Location) => Location;
}

type InjectedPropsFromLocation<StateInLocation> = Partial<StateInLocation> & {
  pushStateInLocation?: (state: StateInLocation) => void;
  replaceStateInLocation?: (state: StateInLocation) => void;
};

export const withStateFromLocation = <StateInLocation extends {}>({
  mapLocationToState,
  mapStateToLocation,
}: WithStateFromLocationOptions<StateInLocation>) => <
  WrappedComponentProps extends InjectedPropsFromLocation<StateInLocation>
>(
  WrappedComponent: React.ComponentType<WrappedComponentProps>
) => {
  const wrappedName = WrappedComponent.displayName || WrappedComponent.name;

  return withRouter(
    class WithStateFromLocation extends React.PureComponent<
      RouteComponentProps<{}> &
        Omit<WrappedComponentProps, InjectedPropsFromLocation<StateInLocation>>
    > {
      public static displayName = `WithStateFromLocation(${wrappedName})`;

      public render() {
        const { location } = this.props;
        const otherProps = omit(this.props, ['location', 'history', 'match', 'staticContext']);

        const stateFromLocation = mapLocationToState(location);

        return (
          // @ts-ignore
          <WrappedComponent
            {...otherProps}
            {...stateFromLocation}
            pushStateInLocation={this.pushStateInLocation}
            replaceStateInLocation={this.replaceStateInLocation}
          />
        );
      }

      private pushStateInLocation = (state: StateInLocation) => {
        const { history, location } = this.props;

        const newLocation = mapStateToLocation(state, this.props.location);

        if (newLocation !== location) {
          history.push(newLocation);
        }
      };

      private replaceStateInLocation = (state: StateInLocation) => {
        const { history, location } = this.props;

        const newLocation = mapStateToLocation(state, this.props.location);

        if (newLocation !== location) {
          history.replace(newLocation);
        }
      };
    }
  );
};

const decodeRisonAppState = (queryValues: { _a?: string }): AnyObject => {
  try {
    return queryValues && queryValues._a ? decode_object(queryValues._a) : {};
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

const encodeRisonAppState = (state: AnyObject) => ({
  _a: encode_object(state),
});

export const mapRisonAppLocationToState = <State extends {}>(
  mapState: (risonAppState: AnyObject) => State = (state: AnyObject) => state as State
) => (location: Location): State => {
  const queryValues = parse(location.search.substring(1), { sort: false });
  const decodedState = decodeRisonAppState(queryValues);
  return mapState(decodedState);
};

export const mapStateToRisonAppLocation = <State extends {}>(
  mapState: (state: State) => AnyObject = (state: State) => state
) => (state: State, location: Location): Location => {
  const previousQueryValues = parse(location.search.substring(1), { sort: false });
  const previousState = decodeRisonAppState(previousQueryValues);

  const encodedState = encodeRisonAppState({
    ...previousState,
    ...mapState(state),
  });
  const newQueryValues = stringify(
    {
      ...previousQueryValues,
      ...encodedState,
    },
    { sort: false }
  );
  return {
    ...location,
    search: `?${newQueryValues}`,
  };
};
