/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { WithHeaderLayout } from '../../layouts';
import { useConfig } from '../../hooks';

export const FleetApp: React.FunctionComponent = () => {
  const { fleet } = useConfig();
  if (!fleet.enabled) {
    return null;
  }

  return (
    <WithHeaderLayout
      leftColumn={
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiText>
              <h1>
                <FormattedMessage id="xpack.ingestManager.fleet.pageTitle" defaultMessage="Fleet" />
              </h1>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestManager.fleet.pageSubtitle"
                  defaultMessage="Manage and deploy configuration updates to a group of agents of any size."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      tabs={[
        {
          id: 'agents',
          name: 'Agents',
          isSelected: true,
        },
        {
          id: 'enrollment_keys',
          name: 'Enrollment keys',
        },
      ]}
    >
      hello world - fleet app
    </WithHeaderLayout>
  );
};
