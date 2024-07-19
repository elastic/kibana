/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { IndicesCard } from './indices_card';
import { ConsoleLinkButton } from './console_link_button';

export interface SearchHomepageBodyProps {
  onCreateIndex: () => void;
}

export const SearchHomepageBody = ({ onCreateIndex }: SearchHomepageBodyProps) => (
  <KibanaPageTemplate.Section alignment="top" restrictWidth={false} grow>
    <EuiFlexGroup direction="column">
      <EuiFlexItem style={{ width: '100%' }}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <ConsoleLinkButton />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ width: '100%' }}>
        <EuiFlexGroup justifyContent="spaceBetween" direction="row">
          <EuiFlexItem grow={1}>
            <IndicesCard onCreateIndex={onCreateIndex} />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <span />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </KibanaPageTemplate.Section>
);
