/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { PackagePolicyResponseExtensionComponentProps } from '@kbn/fleet-plugin/public';

import { PolicyResponseWrapper } from '../../../../components/policy_response';

const Container = styled.div`
  padding: ${({ theme }) => theme.eui.paddingSizes.m};
`;

/**
 * Exports Endpoint-specific package policy response
 */
export const EndpointPolicyResponseExtension = memo<PackagePolicyResponseExtensionComponentProps>(
  ({ endpointId }) => {
    return (
      <Container>
        <PolicyResponseWrapper endpointId={endpointId} />
      </Container>
    );
  }
);
EndpointPolicyResponseExtension.displayName = 'EndpointPolicyResponseExtension';
