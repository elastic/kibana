/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AttributionControl } from './view';
import { getLayerList } from "../../../selectors/map_selectors";

function mapStateToProps(state = {}) {
  return {
    layerList: getLayerList(state)
  };
}

function mapDispatchToProps() {
  return {};
}

const connectedViewControl = connect(mapStateToProps, mapDispatchToProps)(AttributionControl);
export { connectedViewControl as AttributionControl };
