/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';
import { ConnectorCard } from './card';
import { connectorsFieldLabels } from '.';

interface ConnectorComponentProps {
  name: string;
  type: string;
  fields: ConnectorTypeFields['fields'];
}

const MyFlexGroup = styled(EuiFlexGroup)`
  margin-top: 0;
  & *,
  & img {
    margin: 0;
  }
`;

const ConnectorComponent: React.FC<ConnectorComponentProps> = ({ name, type, fields }) => {
  const listItems = useMemo(
    () =>
      Object.entries(fields ?? {})
        .filter(([key, value]) => value != null)
        .map(([key, value]) => {
          const connectorLabels = connectorsFieldLabels[type] ?? {};

          return { title: connectorLabels[key] ?? '', description: value };
        }),
    [fields, type]
  );

  return (
    <EuiFlexGroup direction="column" data-test-subj="settings-connector-wrapper">
      <EuiFlexItem grow={false}>
        <MyFlexGroup alignItems="center" gutterSize="none">
          <ConnectorCard listItems={listItems} connectorType={type} title={name} />
        </MyFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Connector = memo(ConnectorComponent);
