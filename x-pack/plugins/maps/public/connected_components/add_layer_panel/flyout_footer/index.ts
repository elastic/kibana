/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { FlyoutFooter } from './view';
import { hasPreviewLayers, isLoadingPreviewLayers } from '../../../selectors/map_selectors';
import { removePreviewLayers, updateFlyout } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { FLYOUT_STATE } from '../../../reducers/ui';

function mapStateToProps(state: MapStoreState) {
  return {
    hasPreviewLayers: hasPreviewLayers(state),
    isLoading: isLoadingPreviewLayers(state),
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    closeFlyout: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch<any>(removePreviewLayers());
    },
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps)(FlyoutFooter);
export { connectedFlyOut as FlyoutFooter };
