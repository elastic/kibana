/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { getIsReadOnly } from '../../../../../store/ui';
import {
  fitToLayerExtent,
  toggleLayerVisible,
  cloneLayer,
  openLayerDetailsPanel,
} from '../../../../../actions/store_actions';

import { hasDirtyState, getSelectedLayer } from '../../../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    isReadOnly: getIsReadOnly(state),
    zoom: _.get(state, 'map.mapState.zoom', 0),
    selectedLayer: getSelectedLayer(state),
    hasDirtyStateSelector: hasDirtyState(state),
  };
}

const mapDispatchToProps = {
  cloneLayer,
  fitToBounds: fitToLayerExtent,
  openLayerPanel: openLayerDetailsPanel,
  toggleVisible: toggleLayerVisible,
};

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
