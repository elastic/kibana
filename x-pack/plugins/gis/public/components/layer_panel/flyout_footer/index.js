/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyoutFooter } from './view';
import { updateFlyout, FLYOUT_STATE } from '../../../store/ui';
import { setSelectedLayer } from '../../../actions/store_actions';

const mapDispatchToProps = {
  cancelLayerPanel: () => updateFlyout(FLYOUT_STATE.NONE),
  saveLayerEdits: () => updateFlyout(FLYOUT_STATE.NONE) && setSelectedLayer(null)
};

function mapStateToProps() {
  return {};
}

const connectedFlyoutFooter = connect(mapStateToProps, mapDispatchToProps)(FlyoutFooter);
export { connectedFlyoutFooter as FlyoutFooter };
