/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { OLMapContainer } from './view';
import { getOlMapAndLayers } from "../../selectors/ol_map_selectors";

function mapStateToProps(state = {}) {
  return {
    olMap: getOlMapAndLayers(state)
  };
}

const connectedKibanaMap = connect(mapStateToProps, {}, null,
  { withRef: true })(OLMapContainer);
export { connectedKibanaMap as OLMapContainer };
