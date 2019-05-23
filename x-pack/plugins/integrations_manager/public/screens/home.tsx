/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { getIntegrationsList } from '../data';
import { IntegrationCard } from '../components/integration_card';
import { IntegrationInfo } from '../../common/types';

export function Home() {
  const [list, setList] = useState([] as IntegrationInfo[]);

  useEffect(() => {
    getIntegrationsList().then(({ data }) => setList(data));
  }, []);

  return (
    <EuiPanel>
      <EuiTitle>
        <h1>Elastic Integrations Manager</h1>
      </EuiTitle>
      <EuiSpacer />
      <EuiText>
        <h3>Available Integrations</h3>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGrid gutterSize="l" columns={3}>
        {list.map(props => (
          <EuiFlexItem key={`${props.name}-${props.version}`}>
            <IntegrationCard {...props} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  );
}
