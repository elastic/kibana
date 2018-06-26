/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { updateFlyout, FLYOUT_STATE } from '../../../store/ui';
import { setSelectedLayer } from '../../../actions/map_actions';

function mapDispatchToProps(dispatch) {
  return {
    onButtonClick: layerId => {
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
      dispatch(setSelectedLayer(layerId));
    }
  };
}

function mapStateToProps() {
  return {
  };
}

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
