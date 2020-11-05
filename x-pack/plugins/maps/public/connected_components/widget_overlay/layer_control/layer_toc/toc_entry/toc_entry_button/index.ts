/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MapStoreState } from '../../../../../../reducers/store';
import { getMapZoom, isUsingSearch } from '../../../../../../selectors/map_selectors';
import { TOCEntryButton } from './toc_entry_button';

function mapStateToProps(state: MapStoreState) {
  return {
    isUsingSearch: isUsingSearch(state),
    zoom: getMapZoom(state),
  };
}

const connected = connect(mapStateToProps, null)(TOCEntryButton);
export { connected as TOCEntryButton };
