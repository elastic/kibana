/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

// import {
//   disconnectRemoteClusters,
// } from '../../../../store/actions';

import { DisconnectButton as DisconnectButtonComponent } from './disconnect_button';

const mapDispatchToProps = (/*dispatch*/) => {
  return {
    disconnectRemoteClusters: (/*names*/) => {
      // dispatch(disconnectRemoteClusters({ names }));
    },
  };
};

export const DisconnectButton = connect(
  undefined,
  mapDispatchToProps,
)(DisconnectButtonComponent);
