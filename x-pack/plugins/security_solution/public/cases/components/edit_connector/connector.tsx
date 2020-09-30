/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import styled from 'styled-components';

import { connectorsConfiguration } from '../../../common/lib/connectors/config';

interface TagsProps {
  name: string;
  type: string;
}

const MyFlexGroup = styled(EuiFlexGroup)`
  margin-top: 0;
  & *,
  & img {
    margin: 0;
  }
`;

const MyEuiText = styled(EuiText)`
  margin-left: 10px;
`;

const ConnectorComponent: React.FC<TagsProps> = ({ name, type }) => {
  return (
    <MyFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiIcon type={connectorsConfiguration[type]?.logo ?? ''} size="xl" />
      </EuiFlexItem>
      <MyEuiText grow={false}>
        <EuiText size="s" data-test-subj="static-connector-name">
          {name}
        </EuiText>
      </MyEuiText>
    </MyFlexGroup>
  );
};

export const Connector = memo(ConnectorComponent);
