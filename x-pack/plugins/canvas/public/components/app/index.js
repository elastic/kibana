/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { getAppReady } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { trackRouteChange } from './track_route_change';
import { App as Component } from './app';

const mapStateToProps = state => {
  // appReady could be an error object
  const appState = getAppReady(state);

  return {
    appState: typeof appState === 'object' ? appState : { ready: appState },
  };
};

const mapDispatchToProps = {
  setAppReady: appReady,
  setAppError: appError,
};

export const App = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withProps(() => ({
    onRouteChange: trackRouteChange,
  }))
)(Component);
