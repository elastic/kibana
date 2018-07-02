/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyOut } from './view';
import { getFlyoutDisplay, updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { getLayerOptionsByOriginAndType, getLayerLoading, getTemporaryLayers }
  from "../../selectors/map_selectors";
import { addVectorLayer, removeLayer, clearTemporaryLayers, promoteTemporaryLayers }
  from "../../actions/map_actions";
import _ from 'lodash';

function mapStateToProps(state = {}) {

  const layerOptions = getLayerOptionsByOriginAndType(state);
  const emsSourceName = _.get(layerOptions, 'EMS.VECTOR[0].name');
  const emsVectorOptions = _.get(layerOptions, 'EMS.VECTOR[0].service');

  return {
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    emsVectorOptions: emsVectorOptions
      && emsVectorOptions.map(({ name, id }) =>
        ({ value: `${emsSourceName}:${id}`, text: name })),
    layerLoading: getLayerLoading(state),
    temporaryLayers: !_.isEmpty(getTemporaryLayers(state))
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => dispatch(updateFlyout(FLYOUT_STATE.NONE))
      && dispatch(clearTemporaryLayers()),
    selectAction: (sourceName, layerId) =>
      dispatch(addVectorLayer(sourceName, layerId, { temporary: true })),
    removeAction: layerName => dispatch(removeLayer(layerName)),
    addAction: () => dispatch(promoteTemporaryLayers())
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(FlyOut);
export { connectedFlyOut as FlyOut };
