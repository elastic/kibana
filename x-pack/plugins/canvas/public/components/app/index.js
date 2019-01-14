/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionsRegistry } from 'plugins/interpreter/functions_registry';
import { getInterpreter, updateInterpreterFunctions } from 'plugins/interpreter/interpreter';
import { loadBrowserRegistries } from '@kbn/interpreter/public';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { getAppReady, getBasePath } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { loadPrivateBrowserFunctions } from '../../lib/load_private_browser_functions';
import { elementsRegistry } from '../../lib/elements_registry';
import { templatesRegistry } from '../../lib/templates_registry';
import { tagsRegistry } from '../../lib/tags_registry';
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

const types = {
  elements: elementsRegistry,
  renderers: renderFunctionsRegistry,
  transformUIs: transformRegistry,
  datasourceUIs: datasourceRegistry,
  modelUIs: modelRegistry,
  viewUIs: viewRegistry,
  argumentUIs: argTypeRegistry,
  templates: templatesRegistry,
  tagUIs: tagsRegistry,
};

const mapDispatchToProps = dispatch => ({
  // TODO: the correct socket path should come from upstream, using the constant here is not ideal
  setAppReady: basePath => async () => {
    try {
      // wait for core interpreter to load
      await getInterpreter();
      // initialize the socket and interpreter
      loadPrivateBrowserFunctions(functionsRegistry);
      await updateInterpreterFunctions();
      await loadBrowserRegistries(types, basePath);

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
