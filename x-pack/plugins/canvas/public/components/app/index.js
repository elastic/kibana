/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSocket } from '@kbn/interpreter/public/socket';
import { initialize as initializeInterpreter } from '@kbn/interpreter/public/interpreter';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
<<<<<<< HEAD
import { createSocket } from '../../socket';
import { initialize as initializeInterpreter } from '../../lib/interpreter';
import { populateBrowserRegistries } from '../../lib/browser_registries';
=======
import { populateBrowserRegistries } from '@kbn/interpreter/public/browser_registries';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { getAppReady, getBasePath } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { loadPrivateBrowserFunctions } from '../../lib/load_private_browser_functions';
import { elementsRegistry } from '../../lib/elements_registry';
import { renderFunctionsRegistry } from '../../lib/render_functions_registry';
import {
  argTypeRegistry,
  datasourceRegistry,
  modelRegistry,
  transformRegistry,
  viewRegistry,
} from '../../expression_types';
import { App as Component } from './app';
import { trackRouteChange } from './track_route_change';

const mapStateToProps = state => {
  // appReady could be an error object
  const appState = getAppReady(state);

  return {
    appState: typeof appState === 'object' ? appState : { ready: appState },
    basePath: getBasePath(state),
  };
};

<<<<<<< HEAD
=======
const types = {
  elements: elementsRegistry,
  renderers: renderFunctionsRegistry,
  transformUIs: transformRegistry,
  datasourceUIs: datasourceRegistry,
  modelUIs: modelRegistry,
  viewUIs: viewRegistry,
  argumentUIs: argTypeRegistry,
};

>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
const mapDispatchToProps = dispatch => ({
  // TODO: the correct socket path should come from upstream, using the constant here is not ideal
  setAppReady: basePath => async () => {
    try {
      // initialize the socket and interpreter
      await createSocket(basePath);
<<<<<<< HEAD
      await populateBrowserRegistries();
=======
      loadPrivateBrowserFunctions();
      await populateBrowserRegistries(types);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      await initializeInterpreter();

      // set app state to ready
      dispatch(appReady());
    } catch (e) {
      dispatch(appError(e));
    }
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
