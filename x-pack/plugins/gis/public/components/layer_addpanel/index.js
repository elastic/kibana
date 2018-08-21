/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyOut } from './view';
import { getFlyoutDisplay, updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { getLayerLoading, getTemporaryLayers } from "../../selectors/map_selectors";
import { addLayerFromSource, removeLayer, clearTemporaryLayers, promoteTemporaryLayers } from "../../actions/store_actions";
import _ from 'lodash';

function mapStateToProps(state = {}) {

  const dataSourceMeta = (state.config.meta && state.config.meta.data_sources) ? state.config.meta.data_sources : null;
  return {
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    dataSourcesMeta: dataSourceMeta,
    layerLoading: getLayerLoading(state),
    temporaryLayers: !_.isEmpty(getTemporaryLayers(state))
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => dispatch(updateFlyout(FLYOUT_STATE.NONE)) && dispatch(clearTemporaryLayers()),
    previewSource: (sourceDescriptor) => {
      dispatch(addLayerFromSource(sourceDescriptor, { temporary: true }));
    },
    removeAction: layerName => dispatch(removeLayer(layerName)),
    addAction: () => dispatch(promoteTemporaryLayers())
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(FlyOut);
export { connectedFlyOut as FlyOut };
