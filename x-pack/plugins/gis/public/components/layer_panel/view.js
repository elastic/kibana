/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { FlyoutBody } from './flyout_body';
import { FlyoutFooter } from './flyout_footer';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiHorizontalRule,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

export function LayerPanel({ selectedLayer }) {
  return (
    <EuiFlyout
      onClose={() => console.warn('EuiFlyout#onClose not implemented.')}
      style={{ maxWidth: 768 }}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2>{selectedLayer.getDisplayName()}</h2>
        </EuiTitle>
        <EuiSpacer size="m"/>
        <EuiSpacer/>
        <EuiHorizontalRule margin="none"/>
      </EuiFlyoutHeader>

      <EuiFlyoutBody style={{ paddingTop: 0 }}>
        <EuiSpacer size="l"/>
        <FlyoutBody/>
        <EuiSpacer size="l"/>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <FlyoutFooter/>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
