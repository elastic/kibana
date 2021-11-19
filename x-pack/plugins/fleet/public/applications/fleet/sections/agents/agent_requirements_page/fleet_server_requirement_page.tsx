/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { useStartServices } from '../../../hooks';

import { CloudInstructions, OnPremInstructions } from './components';

const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
  max-width: 100%;
`;

const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
`;

export const FleetServerRequirementPage = () => {
  const startService = useStartServices();
  const deploymentUrl = startService.cloud?.deploymentUrl;

  return (
    <>
      <ContentWrapper
        gutterSize="none"
        justifyContent="center"
        alignItems="center"
        direction="column"
      >
        <FlexItemWithMinWidth grow={false}>
          {deploymentUrl ? (
            <CloudInstructions deploymentUrl={deploymentUrl} />
          ) : (
            <OnPremInstructions />
          )}
        </FlexItemWithMinWidth>
      </ContentWrapper>
    </>
  );
};
