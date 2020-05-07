/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { EditSettingsJson as PresentationComponent } from './edit_settings_json';
import { closeDetailPanel, loadIndexData, updateIndexSettings } from '../../../../../store/actions';
import {
  getDetailPanelData,
  getDetailPanelError,
  getDetailPanelIndexName,
  getIndexStatusByIndexName,
} from '../../../../../store/selectors';

const mapStateToProps = state => {
  const indexName = getDetailPanelIndexName(state);
  return {
    error: getDetailPanelError(state),
    data: getDetailPanelData(state),
    indexName,
    indexStatus: getIndexStatusByIndexName(state, indexName),
  };
};

const mapDispatchToProps = {
  loadIndexData,
  closeDetailPanel,
  updateIndexSettings,
};

export const EditSettingsJson = connect(mapStateToProps, mapDispatchToProps)(PresentationComponent);
