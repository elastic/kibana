/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  DetailPanel,
  IndexTable,
} from '../../components';
import {
  REFRESH_RATE_INDEX_LIST
} from '../../../../constants';

export class IndexList extends React.PureComponent {
  componentWillMount() {
    this.props.loadIndices();
  }

  componentDidMount() {
    this.interval = setInterval(this.props.reloadIndices, REFRESH_RATE_INDEX_LIST);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <div className="indTable__horizontalScroll im-snapshotTestSubject">
        <IndexTable />
        <DetailPanel />
      </div>
    );
  }
}
