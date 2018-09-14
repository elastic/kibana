/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { GISApp } from './view';
import { getFlyoutDisplay, FLYOUT_STATE } from '../../store/ui';

function mapStateToProps(state = {}) {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    layerDetailsVisible: flyoutDisplay === FLYOUT_STATE.LAYER_PANEL,
    addLayerVisible: flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD,
    noFlyoutVisible: flyoutDisplay === FLYOUT_STATE.NONE
  };
}

const connectedGISApp = connect(mapStateToProps)(GISApp);
export { connectedGISApp as GISApp };
