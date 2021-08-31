/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
// @ts-ignore
import { NoData } from '../../components/no_data';

export const NoDataPage: React.FC = () => {
  return (
    <div className="app-container">
      <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween" responsive>
        <EuiFlexItem />
        <EuiFlexItem>
          <div>HERE GOES THE TIMEPICKER</div>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div>
        <NoData />
      </div>
    </div>
  );
};
