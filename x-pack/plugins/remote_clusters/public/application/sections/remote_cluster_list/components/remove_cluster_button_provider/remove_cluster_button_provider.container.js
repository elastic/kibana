/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { removeClusters } from '../../../../store/actions';

import { RemoveClusterButtonProvider as RemoveClusterButtonProviderComponent } from './remove_cluster_button_provider';

const mapDispatchToProps = dispatch => {
  return {
    removeClusters: names => {
      dispatch(removeClusters(names));
    },
  };
};

export const RemoveClusterButtonProvider = connect(
  undefined,
  mapDispatchToProps
)(RemoveClusterButtonProviderComponent);
