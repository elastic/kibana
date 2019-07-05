/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerTOC } from './view';
import { updateLayerOrder } from "../../../../actions/store_actions";
import { getLayerList } from "../../../../selectors/map_selectors";

const mapDispatchToProps = {
  updateLayerOrder: newOrder => updateLayerOrder(newOrder)
};

function mapStateToProps(state = {}) {
  return {
    layerList: getLayerList(state)
  };
}

const connectedLayerTOC = connect(mapStateToProps, mapDispatchToProps, null,
  { withRef: true })(LayerTOC);
export { connectedLayerTOC as LayerTOC };
