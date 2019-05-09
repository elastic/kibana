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
import { InputsModelId, TimeRange, TimeRangeKinds, UrlInputsModel } from '../../store/inputs/model';

interface UrlState {
  timerange: UrlInputsModel;
  [key: string]: any;
}

interface UrlStateProps {
  urlState: UrlState;
  mapToUrlState?: (value: any) => UrlState | undefined;
  onChange?: (urlState: UrlState, previousUrlState: UrlState | undefined) => void;
  onInitialize?: (urlState: UrlState | undefined) => void;
}

interface UrlStateDispatchProps {
  setAbsoluteTimerange: ActionCreator<{
    id: InputsModelId;
    fromStr: undefined;
    toStr: undefined;
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

type UrlStateContainerProps = UrlStateProps & UrlStateDispatchProps;

interface UrlStateContainerLifecycles {
  location: Location;
  history: History;
}

type UrlStateContainerLifecycleProps = UrlStateContainerLifecycles & UrlStateContainerProps;

class UrlStateContainerLifecycle extends React.Component<UrlStateContainerLifecycleProps> {
  public render() {
    return null;
  }

  public componentDidUpdate({
    location: prevLocation,
    urlState: prevUrlState,
  }: UrlStateContainerLifecycleProps) {
    const { history, location, urlState } = this.props;
    if (JSON.stringify(urlState) !== JSON.stringify(prevUrlState)) {
      Object.keys(urlState).map((urlKey: string) => {
        if (JSON.stringify(urlState[urlKey]) !== JSON.stringify(prevUrlState[urlKey])) {
          this.replaceStateInLocation(urlState[urlKey], urlKey);
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
    (urlState: UrlState | undefined, urlStateKey: string) => {
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
            const urlStateData: UrlInputsModel = decodeRisonUrlState(newUrlStateString);
            const globalType: TimeRangeKinds = get('global.kind', urlStateData);
            const globalRange: TimeRange = urlStateData.global;
            const globalId: InputsModelId = 'global';
            if (globalType !== null) {
              // @ts-ignore
              this.urlStateMappedToActions.timerange[globalType]({
                ...globalRange,
                id: globalId,
              });
            }
            const timelineRange: TimeRange = urlStateData.timeline;
            const timelineType: TimeRangeKinds = get('timeline.kind', urlStateData);
            const timelineId: InputsModelId = 'timeline';
            if (timelineType !== null) {
              // @ts-ignore
              this.urlStateMappedToActions.timerange[timelineType]({
                ...timelineRange,
                id: timelineId,
              });
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
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    return {
      urlState: {
        timerange: inputState
          ? {
              global: get('global.timerange', inputState),
              timeline: get('timeline.timerange', inputState),
            }
          : {},
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
