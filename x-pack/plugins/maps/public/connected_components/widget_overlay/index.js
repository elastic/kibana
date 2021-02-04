/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { WidgetOverlay } from './widget_overlay';

import { isLayerControlHidden, isViewControlHidden } from '../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    hideLayerControl: isLayerControlHidden(state),
    hideViewControl: isViewControlHidden(state),
  };
}

const connectedWidgetOverlay = connect(mapStateToProps, null)(WidgetOverlay);
export { connectedWidgetOverlay as WidgetOverlay };
