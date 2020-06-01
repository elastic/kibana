/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MapsTopNavMenu } from './top_nav_menu';
import {
  enableFullScreen,
  openMapSettings,
  removePreviewLayers,
  setRefreshConfig,
  setSelectedLayer,
  updateFlyout,
} from '../../../actions';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { getStore } from '../../store_operations';

function mapStateToProps(/* state = {} */) {
  return {};
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => {
      dispatch(setSelectedLayer(null));
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(removePreviewLayers());
    },
    setRefreshStoreConfig: (refreshConfig) => dispatch(setRefreshConfig(refreshConfig)),
    enableFullScreen: () => dispatch(enableFullScreen()),
    openMapSettings: () => dispatch(openMapSettings()),
    syncSavedMap: ({ syncWithStore }) => syncWithStore(getStore().getState()),
  };
}

const connectedMapsTopNavMenu = connect(mapStateToProps, mapDispatchToProps)(MapsTopNavMenu);
export { connectedMapsTopNavMenu as MapsTopNavMenu };
