/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyoutFooter } from './view';
import { updateFlyout, FLYOUT_STATE } from '../../../store/ui';
import { promoteTemporaryStyles, clearTemporaryStyles, setSelectedLayer, removeLayer } from '../../../actions/store_actions';

const mapDispatchToProps = dispatch => {
  return {
    cancelLayerPanel: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(clearTemporaryStyles());
    },
    saveLayerEdits: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(promoteTemporaryStyles());
      dispatch(setSelectedLayer(null));
    },
    removeLayer: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(removeLayer());
      dispatch(setSelectedLayer(null));
    }
  };
};

const connectedFlyoutFooter = connect(null, mapDispatchToProps)(FlyoutFooter);
export { connectedFlyoutFooter as FlyoutFooter };
