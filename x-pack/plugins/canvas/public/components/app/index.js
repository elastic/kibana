/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionsRegistry } from 'plugins/interpreter/functions_registry';
import { renderFunctionsRegistry } from 'plugins/interpreter/render_functions_registry';
import { getInterpreter } from 'plugins/interpreter/interpreter';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { getAppReady, getBasePath } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { loadPrivateBrowserFunctions } from '../../lib/load_private_browser_functions';
import { elementsRegistry } from '../../lib/elements_registry';
import { templatesRegistry } from '../../lib/templates_registry';
import { tagsRegistry } from '../../lib/tags_registry';
import { elementSpecs } from '../../elements';
import { transformSpecs } from '../../uis/transforms';
import { datasourceSpecs } from '../../uis/datasources';
import { modelSpecs } from '../../uis/models';
import { viewSpecs } from '../../uis/views';
import { args } from '../../uis/arguments';
import { tagSpecs } from '../../uis/tags';
import { templateSpecs } from '../../templates';
import { renderFunctions } from '../../renderers';

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

elementSpecs.forEach(spec => elementsRegistry.register(spec));
transformSpecs.forEach(spec => transformRegistry.register(spec));
datasourceSpecs.forEach(spec => datasourceRegistry.register(spec));
modelSpecs.forEach(spec => modelRegistry.register(spec));
viewSpecs.forEach(spec => viewRegistry.register(spec));
args.forEach(spec => argTypeRegistry.register(spec));
templateSpecs.forEach(spec => templatesRegistry.register(spec));
tagSpecs.forEach(spec => tagsRegistry.register(spec));
renderFunctions.forEach(spec => renderFunctionsRegistry.register(spec));

const mapDispatchToProps = dispatch => ({
  // TODO: the correct socket path should come from upstream, using the constant here is not ideal
  setAppReady: () => async () => {
    try {
      // wait for core interpreter to load
      await getInterpreter();
      // initialize the socket and interpreter
      loadPrivateBrowserFunctions(functionsRegistry);
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
