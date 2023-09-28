/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { Summary as PresentationComponent } from './summary';

import { getIndexByIndexName, getDetailPanelIndexName } from '../../../../../store/selectors';

const mapStateToProps = (state) => {
  const indexName = getDetailPanelIndexName(state);
  return {
    indexName,
    index: getIndexByIndexName(state, indexName),
  };
};

export const Summary = connect(mapStateToProps)(PresentationComponent);
