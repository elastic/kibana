/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';

const Header = dynamic(() => import('./header'));
const Overview = dynamic(() => import('./overview'));

export function DatasetQualityDetails() {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <Header loading={false} />
        <EuiHorizontalRule />
        <Overview />
        <EuiHorizontalRule />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
