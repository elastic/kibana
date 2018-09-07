/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MBMapContainer } from './view';

function mapStateToProps() {
  return {
    mbMap: null
  };
}

function mapDispatchToProps() {
  return {
    extentChanged: () => {
      console.warn('not implemented');
    },
    initialize: () => {
      console.warn('not implemented');
    }
  };
}

const connectedKibanaMap = connect(mapStateToProps, mapDispatchToProps, null,
  { withRef: true })(MBMapContainer);
export { connectedKibanaMap as MBMapContainer };
