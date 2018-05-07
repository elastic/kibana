/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { IndexList as PresentationComponent } from './index_list';

import {
  loadIndices,
  reloadIndices
} from '../../../../store/actions';

const mapDispatchToProps = (dispatch) => {
  return {
    loadIndices: () => {
      dispatch(loadIndices());
    },
    reloadIndices: () => {
      dispatch(reloadIndices());
    }
  };
};

export const IndexList = connect(null, mapDispatchToProps)(PresentationComponent);
