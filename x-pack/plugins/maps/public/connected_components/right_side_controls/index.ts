/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { MapStoreState } from '../../reducers/store';
import { getMapSettings } from '../../selectors/map_selectors';
import { RightSideControls } from './right_side_controls';

function mapStateToProps(state: MapStoreState) {
  return {
    settings: getMapSettings(state),
  };
}

const connected = connect(mapStateToProps, {})(RightSideControls);
export { connected as RightSideControls };
