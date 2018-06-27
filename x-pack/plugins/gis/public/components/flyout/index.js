/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyOut } from './view';
import { getFlyoutDisplay, updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { getVectorLayerOptionsByName } from "../../selectors/map_selectors";
import { addVectorLayer } from "../../actions/map_actions";
import _ from 'lodash';

function mapStateToProps(state = {}) {
  const namedVectorLayers = getVectorLayerOptionsByName(state);
  const emsVectorLayers = _.isEmpty(namedVectorLayers) ? null
    : namedVectorLayers.ems_source[0].service;
  return {
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    emsLayerOptions: emsVectorLayers
  };
}

const mapDispatchToProps = {
  closeFlyout: () => updateFlyout(FLYOUT_STATE.NONE),
  selectAction: layerName => addVectorLayer('ems_source', layerName)
};

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(FlyOut);
export { connectedFlyOut as FlyOut };
