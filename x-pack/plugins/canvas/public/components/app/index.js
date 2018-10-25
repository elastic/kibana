/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { createSocket } from '../../socket';
import { initialize as initializeInterpreter } from '../../lib/interpreter';
import { getAppReady, getBasePath } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { trackRouteChange } from './track_route_change';
import { App as Component } from './app';

const mapStateToProps = state => {
  // appReady could be an error object
  const appState = getAppReady(state);

  return {
    appState: typeof appState === 'object' ? appState : { ready: appState },
    basePath: getBasePath(state),
  };
};

const mapDispatchToProps = dispatch => ({
  // TODO: the correct socket path should come from upstream, using the constant here is not ideal
  setAppReady: basePath => async () => {
    // initialize the socket and interpreter
    createSocket(basePath);
    await initializeInterpreter();

    // set app state to ready
    dispatch(appReady());
  },
  setAppError: payload => dispatch(appError(payload)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return {
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    setAppReady: dispatchProps.setAppReady(stateProps.basePath),
  };
};

export const App = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withProps(() => ({
    onRouteChange: trackRouteChange,
  }))
)(Component);
