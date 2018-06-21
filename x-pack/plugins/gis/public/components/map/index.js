/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { KibanaMap } from './view';
import { getOlLayers } from "../../selectors/ol_map_selectors";
import { updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { setSelectedLayer } from '../../actions/map_actions';

const mapDispatchToProps = {
  showLayerDetails: layer =>
    updateFlyout(FLYOUT_STATE.LAYER_PANEL) && setSelectedLayer(layer)
};

function mapStateToProps(state = {}) {
  return {
    olLayers: getOlLayers(state)
  };
}

const connectedKibanaMap = connect(mapStateToProps, mapDispatchToProps, null,
  { withRef: true })(KibanaMap);
export { connectedKibanaMap as KibanaMap };
