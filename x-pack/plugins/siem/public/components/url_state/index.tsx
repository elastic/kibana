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
import { inputsActions, inputsSelectors, State } from '../../store';
import { UrlInputsModel, InputsModelId, TimeRangeKinds, TimeRange } from '../../store/inputs/model';

interface UrlState {
  global: any;
  timeline: any;
}

interface UrlStateContainerProps {
  urlState: UrlState | undefined;
  urlStateKey: string;
  mapToUrlState?: (value: any) => UrlState | undefined;
  onChange?: (urlState: UrlState, previousUrlState: UrlState | undefined) => void;
  onInitialize?: (urlState: UrlState | undefined) => void;
}

interface UrlStateReduxProps {
  limit: number;
}

interface UrlStateDispatchProps {
  setAbsoluteTimerange: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
  setRelativeTimerange: ActionCreator<{
    id: InputsModelId;
    fromStr: string;
    toStr: string;
    from: number;
    to: number;
  }>;
}

interface UrlStateContainerLifecycleProps extends UrlStateContainerProps {
  location: Location;
  history: History;
}

type UrlStateProps = UrlStateContainerLifecycleProps & UrlStateReduxProps & UrlStateDispatchProps;

class UrlStateContainerLifecycle extends React.Component<UrlStateProps> {
  public render() {
    return null;
  }

  public componentDidUpdate({
    location: prevLocation,
    urlState: prevUrlState,
  }: UrlStateContainerLifecycleProps) {
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

  // eslint-disable-next-line @typescript-eslint/member-ordering this is really a method despite what eslint thinks
  private replaceStateInLocation = throttle(1000, (urlState: UrlState | undefined) => {
    const { history, location, urlStateKey } = this.props;

    const newLocation = replaceQueryStringInLocation(
      location,
      replaceStateKeyInQueryString(urlStateKey, urlState)(getQueryStringFromLocation(location))
    );

    if (newLocation !== location) {
      history.replace(newLocation);
    }
  });

  private urlStateMappedToActions = {
    timerange: {
      absolute: this.props.setAbsoluteTimerange,
      relative: this.props.setRelativeTimerange,
    },
    another: {
      nope: true,
    },
  };

  private handleInitialize = (location: Location) => {
    Object.keys(this.urlStateMappedToActions).map(key => {
      const newUrlStateString = getParamFromQueryString(getQueryStringFromLocation(location), key);
      if (newUrlStateString) {
        switch (key) {
          case 'timerange':
            const urlStateData: UrlInputsModel = decodeRisonUrlState(newUrlStateString)
            const globalType: TimeRangeKinds = get('global.kind', urlStateData);
            const globalRange: TimeRange = urlStateData.global;
            const globalId: InputsModelId = 'global';
            if (globalType !== null) {
              return this.urlStateMappedToActions.timerange[globalType]({...globalRange, id: globalId});
            }
        }
        return;
      }
    });
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

export const UrlStateComponents = pure<UrlStateContainerProps>(props => (
  <Route<RouteProps>>
    {({ history, location }) => (
      <UrlStateContainerLifecycle history={history} location={location} {...props} />
    )}
  </Route>
));

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const mapStateToProps = (state: State) => ({
    ...getInputsSelector(state),
    urlStateKey: 'qwrty',
  });

  return mapStateToProps;
};
export const UrlStateContainer = connect(
  makeMapStateToProps,
  {
    setAbsoluteTimerange: inputsActions.setAbsoluteRangeDatePicker,
    setRelativeTimerange: inputsActions.setRelativeRangeDatePicker,
  }
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
  debugger;
  const previousQueryValues = QueryString.decode(queryString);
  const encodedUrlState =
    typeof urlState !== 'undefined' ? encodeRisonUrlState(urlState) : undefined;
  debugger;
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
