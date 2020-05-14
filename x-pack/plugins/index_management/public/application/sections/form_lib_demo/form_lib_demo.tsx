/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormWithoutLib } from './form_without_lib';
import { FormWithFormLib } from './form_with_lib';

export const FormLibDemo = () => {
  return (
    <div>
      <EuiTitle>
        <h1>Form lib demo</h1>
      </EuiTitle>
      <EuiSpacer size="l" />

      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ width: '400px' }}>
          <EuiTitle>
            <h2>Form without form lib</h2>
          </EuiTitle>
          <EuiSpacer />
          <FormWithoutLib />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: '400px' }}>
          <EuiTitle>
            <h2>Form with form lib</h2>
          </EuiTitle>
          <EuiSpacer />
          <FormWithFormLib />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
