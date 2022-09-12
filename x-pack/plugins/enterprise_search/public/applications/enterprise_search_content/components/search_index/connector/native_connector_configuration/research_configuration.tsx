/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import { NativeConnector } from '../types';

interface ResearchConfigurationProps {
  nativeConnector: NativeConnector;
}
export const ResearchConfiguration: React.FC<ResearchConfigurationProps> = ({
  nativeConnector,
}) => {
  const { name } = nativeConnector;

  return (
    <>
      <EuiText size="s">
        {name} supports a variety of authentication mechanisms which will be needed for this
        connector to connect to your instance. Consult with your administrator for the correct
        credentials to use to connect.
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup direction="row" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiLink target="_blank" href="">
            Documentation
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink target="_blank" href="">
            {name} Documentation
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
