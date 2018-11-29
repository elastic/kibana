/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import {
  removeClusters,
} from '../../../../store/actions';

import { RemoveClusterButton as RemoveClusterButtonComponent } from './remove_cluster_button';

const mapDispatchToProps = (dispatch) => {
  return {
    removeClusters: (names) => {
      dispatch(removeClusters(names));
    },
  };
};

export const RemoveClusterButton = connect(
  undefined,
  mapDispatchToProps,
)(RemoveClusterButtonComponent);
