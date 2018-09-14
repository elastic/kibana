/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AddLayerPanel } from './view';
import { getFlyoutDisplay, updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { getTemporaryLayers, getDataSources } from "../../selectors/map_selectors";
import { addLayerFromSource, removeLayer, clearTemporaryLayers, promoteTemporaryLayers } from "../../actions/store_actions";
import _ from 'lodash';

function mapStateToProps(state = {}) {

  const dataSourceMeta = getDataSources(state);
  function isLoading() {
    const tmp = getTemporaryLayers(state);
    return tmp.some((layer) => layer.isLayerLoading());
  }
  return {
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    dataSourcesMeta: dataSourceMeta,
    layerLoading: isLoading(),
    temporaryLayers: !_.isEmpty(getTemporaryLayers(state))
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(clearTemporaryLayers());
    },
    previewSource: (source) => {
      dispatch(addLayerFromSource(source, { temporary: true }));
    },
    removeAction: layerName => dispatch(removeLayer(layerName)),
    addAction: () => dispatch(promoteTemporaryLayers())
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(AddLayerPanel);
export { connectedFlyOut as AddLayerPanel };
