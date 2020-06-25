/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyoutBody } from './flyout_body';
import { INDEXING_STAGE } from '../../../reducers/ui';
import { updateIndexingStage } from '../../../actions';
import { getIndexingStage } from '../../../selectors/ui_selectors';
import { MapStoreState } from '../../../reducers/store';
import { getMapColors } from '../../../selectors/map_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    isIndexingTriggered: getIndexingStage(state) === INDEXING_STAGE.TRIGGERED,
    mapColors: getMapColors(state),
  };
}

const mapDispatchToProps = {
  onIndexReady: (indexReady: boolean) =>
    indexReady ? updateIndexingStage(INDEXING_STAGE.READY) : updateIndexingStage(null),
  importSuccessHandler: () => updateIndexingStage(INDEXING_STAGE.SUCCESS),
  importErrorHandler: () => updateIndexingStage(INDEXING_STAGE.ERROR),
};

const connected = connect(mapStateToProps, mapDispatchToProps)(FlyoutBody);
export { connected as FlyoutBody };
