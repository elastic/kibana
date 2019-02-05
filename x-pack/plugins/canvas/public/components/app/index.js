/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInterpreter } from 'plugins/interpreter/interpreter';
import {
  loadBrowserRegistries,
  registries,
  register,
  addRegistries,
} from '@kbn/interpreter/public';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { getAppReady, getBasePath } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { loadPrivateBrowserFunctions } from '../../lib/load_private_browser_functions';
import { elementsRegistry } from '../../lib/elements_registry';
import { templatesRegistry } from '../../lib/templates_registry';
import { tagsRegistry } from '../../lib/tags_registry';
import { elementSpecs } from '../../../canvas_plugin_src/elements';
import { renderFunctions } from '../../../canvas_plugin_src/renderers';
import { transformSpecs } from '../../../canvas_plugin_src/uis/transforms';
import { modelSpecs } from '../../../canvas_plugin_src/uis/models';
import { viewSpecs } from '../../../canvas_plugin_src/uis/views';
import { datasourceSpecs } from '../../../canvas_plugin_src/uis/datasources';

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

const types = addRegistries({
  elements: elementsRegistry,
  transformUIs: transformRegistry,
  datasourceUIs: datasourceRegistry,
  modelUIs: modelRegistry,
  viewUIs: viewRegistry,
  argumentUIs: argTypeRegistry,
  templates: templatesRegistry,
  tagUIs: tagsRegistry,
});

register({
  elements: elementSpecs,
  renderers: renderFunctions,
  transformUIs: transformSpecs,
  modelUIs: modelSpecs,
  viewUIs: viewSpecs,
  datasourceUIs: datasourceSpecs,
});

const mapDispatchToProps = dispatch => ({
  // TODO: the correct socket path should come from upstream, using the constant here is not ideal
  setAppReady: basePath => async () => {
    try {
      // wait for core interpreter to load
      await getInterpreter();
      // initialize the socket and interpreter
      loadPrivateBrowserFunctions(registries.browserFunctions);

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
