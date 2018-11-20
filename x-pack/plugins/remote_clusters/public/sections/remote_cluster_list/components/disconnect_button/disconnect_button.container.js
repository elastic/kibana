/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import {
  disconnectClusters,
} from '../../../../store/actions';

import { DisconnectButton as DisconnectButtonComponent } from './disconnect_button';

const mapDispatchToProps = (dispatch) => {
  return {
    disconnectClusters: (names) => {
      dispatch(disconnectClusters(names));
    },
  };
};

export const DisconnectButton = connect(
  undefined,
  mapDispatchToProps,
)(DisconnectButtonComponent);
