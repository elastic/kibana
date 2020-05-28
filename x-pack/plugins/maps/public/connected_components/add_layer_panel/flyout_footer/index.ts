/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { FlyoutFooter } from './view';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { clearTransientLayerStateAndCloseFlyout } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  const selectedLayer = getSelectedLayer(state);
  const hasLayerSelected = !!selectedLayer;
  return {
    hasLayerSelected,
    isLoading: hasLayerSelected && selectedLayer!.isLayerLoading(),
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    closeFlyout: () => dispatch<any>(clearTransientLayerStateAndCloseFlyout()),
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps)(FlyoutFooter);
export { connectedFlyOut as FlyoutFooter };
