/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { LayerTOC } from './view';
import { updateLayerOrder } from '../../../../actions';
import { getLayerList } from '../../../../selectors/map_selectors';
import { getIsReadOnly } from '../../../../selectors/ui_selectors';

const mapDispatchToProps = {
  updateLayerOrder: (newOrder) => updateLayerOrder(newOrder),
};

function mapStateToProps(state = {}) {
  return {
    isReadOnly: getIsReadOnly(state),
    layerList: getLayerList(state),
  };
}

const connectedLayerTOC = connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(
  LayerTOC
);
export { connectedLayerTOC as LayerTOC };
