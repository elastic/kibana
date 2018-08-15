/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyoutBody } from './view';
import { updateLayerStyle } from '../../../actions/style_actions';
import { getCurrentLayerStyle, getStyleDescriptor } from
  '../../../selectors/map_selectors';

function mapDispatchToProps(dispatch) {
  return {
    updateColor: color => dispatch(updateLayerStyle({ color }))
  };
}

function mapStateToProps(state) {
  return {
    currentLayerStyle: getCurrentLayerStyle(state),
    styleDescriptor: getStyleDescriptor(state)
  };
}

const connectedFlyoutBody = connect(mapStateToProps, mapDispatchToProps)(FlyoutBody);
export { connectedFlyoutBody as FlyoutBody };