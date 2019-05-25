/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

export const EmptyPlaceholder = (props: any) => {
  return (
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiFlexItem grow={false}>
        <EuiText style={{ fontSize: '24px', color: '#98A2B3' }}>"{props.query}"</EuiText>
      </EuiFlexItem>
      <EuiSpacer size="l" />
      <EuiFlexItem grow={false}>
        <EuiText style={{ fontSize: '28px', color: '#1A1A1A' }}>
          Hmmm... we looked for that, but couldn’t find anything.
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer size="l" />
      <EuiFlexItem grow={false}>
        <EuiText style={{ fontSize: '16px', color: '#69707D' }}>
          You can search for something else or modify your search settings.
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill={true}
          onClick={() => {
            if (props.toggleOptionsFlyout) {
              props.toggleOptionsFlyout();
            }
          }}
        >
          Modify your search settings
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
