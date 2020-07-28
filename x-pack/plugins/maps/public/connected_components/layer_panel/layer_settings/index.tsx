/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { LayerSettings } from './layer_settings';
import {
  updateLayerLabel,
  updateLayerMaxZoom,
  updateLayerMinZoom,
  updateLayerAlpha,
  updateLabelsOnTop,
} from '../../../actions';

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    updateLabel: (id: string, label: string) => dispatch(updateLayerLabel(id, label)),
    updateMinZoom: (id: string, minZoom: number) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id: string, maxZoom: number) => dispatch(updateLayerMaxZoom(id, maxZoom)),
    updateAlpha: (id: string, alpha: number) => dispatch(updateLayerAlpha(id, alpha)),
    updateLabelsOnTop: (id: string, areLabelsOnTop: boolean) =>
      dispatch(updateLabelsOnTop(id, areLabelsOnTop)),
  };
}

const connectedLayerSettings = connect(null, mapDispatchToProps)(LayerSettings);
export { connectedLayerSettings as LayerSettings };
