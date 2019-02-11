/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { MonitorPageTitle as TitleType } from 'x-pack/plugins/uptime/common/graphql/types';

interface MonitorPageTitleProps {
  pageTitle: TitleType;
}

export const MonitorPageTitle = ({ pageTitle: { name, url, id } }: MonitorPageTitleProps) => (
  <EuiFlexGroup alignItems="baseline">
    <EuiFlexItem grow={false}>
      <EuiTitle>
        <h2>{name ? name : url}</h2>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <h4>{id}</h4>
    </EuiFlexItem>
  </EuiFlexGroup>
);
