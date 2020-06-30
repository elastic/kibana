/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { FLYOUT_STATE } from '../../reducers/ui';
import { MapStoreState } from '../../reducers/store';
import { MapSettingsPanel } from './map_settings_panel';
import { rollbackMapSettings, updateMapSetting, updateFlyout } from '../../actions';
import {
  getMapCenter,
  getMapSettings,
  getMapZoom,
  hasMapSettingsChanges,
} from '../../selectors/map_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    center: getMapCenter(state),
    hasMapSettingsChanges: hasMapSettingsChanges(state),
    settings: getMapSettings(state),
    zoom: getMapZoom(state),
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    cancelChanges: () => {
      dispatch(rollbackMapSettings());
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
    },
    keepChanges: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
    },
    updateMapSetting: (settingKey: string, settingValue: string | number | boolean | object) => {
      dispatch(updateMapSetting(settingKey, settingValue));
    },
  };
}

const connectedMapSettingsPanel = connect(mapStateToProps, mapDispatchToProps)(MapSettingsPanel);
export { connectedMapSettingsPanel as MapSettingsPanel };
