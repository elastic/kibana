/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { FLYOUT_STATE } from '../../reducers/ui';
import { MapStoreState } from '../../reducers/store';
import { MapSettingsPanel } from './map_settings_panel';
import { CustomIcon } from '../../../common/descriptor_types';
import {
  deleteCustomIcon,
  rollbackMapSettings,
  updateCustomIcons,
  updateMapSetting,
  updateFlyout,
} from '../../actions';
import {
  getCustomIcons,
  getMapCenter,
  getMapSettings,
  getMapZoom,
  hasMapSettingsChanges,
} from '../../selectors/map_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    center: getMapCenter(state),
    customIcons: getCustomIcons(state),
    hasMapSettingsChanges: hasMapSettingsChanges(state),
    settings: getMapSettings(state),
    zoom: getMapZoom(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
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
    updateCustomIcons: (customIcons: CustomIcon[]) => {
      dispatch(updateCustomIcons(customIcons));
    },
    deleteCustomIcon: (symbolId: string) => {
      dispatch(deleteCustomIcon(symbolId));
    },
  };
}

const connectedMapSettingsPanel = connect(mapStateToProps, mapDispatchToProps)(MapSettingsPanel);
export { connectedMapSettingsPanel as MapSettingsPanel };
