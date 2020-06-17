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
import { getInspectorAdapters } from '../../../reducers/non_serializable_instances';
import { getFlyoutDisplay } from '../../../selectors/ui_selectors';
import { hasDirtyState } from '../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    isOpenSettingsDisabled: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    inspectorAdapters: getInspectorAdapters(state),
    isSaveDisabled: hasDirtyState(state),
  };
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
  };
}

const connectedMapsTopNavMenu = connect(mapStateToProps, mapDispatchToProps)(MapsTopNavMenu);
export { connectedMapsTopNavMenu as MapsTopNavMenu };
