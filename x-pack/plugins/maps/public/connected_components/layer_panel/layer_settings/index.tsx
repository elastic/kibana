/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { LayerSettings } from './layer_settings';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import {
  updateLayerLabel,
  updateLayerMaxZoom,
  updateLayerMinZoom,
  updateLayerAlpha,
  updateLabelsOnTop,
} from '../../../actions';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  const selectedLayer = getSelectedLayer(state);
  return {
    layer: selectedLayer ? selectedLayer : null,
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    updateLabel: (id: string, label: string) => dispatch(updateLayerLabel(id, label)),
    updateMinZoom: (id: string, minZoom: number) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id: string, maxZoom: number) => dispatch(updateLayerMaxZoom(id, maxZoom)),
    updateAlpha: (id: string, alpha: number) => dispatch(updateLayerAlpha(id, alpha)),
    updateLabelsOnTop: (id: string, labelsOnTop: boolean) =>
      dispatch(updateLabelsOnTop(id, labelsOnTop)),
  };
}

const connectedLayerSettings = connect(mapStateToProps, mapDispatchToProps)(LayerSettings);
export { connectedLayerSettings as LayerSettings };
