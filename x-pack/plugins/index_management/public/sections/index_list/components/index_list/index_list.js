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

export class IndexList extends React.PureComponent {
  render() {
    const {
      match: {
        params: {
          filter
        }
      },
    } = this.props;
    return (
      <div className="im-snapshotTestSubject">
        <IndexTable filterFromURI={filter}/>
        <DetailPanel />
      </div>
    );
  }
}
