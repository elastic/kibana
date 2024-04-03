/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import type { EuiStepProps } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { GenerateServiceTokenComponent } from '../../generate_service_token';

export const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
  max-width: 800px;
`;

export const getGenerateServiceTokenStep = ({
  disabled = false,
  serviceToken,
  generateServiceToken,
  isLoadingServiceToken,
}: {
  disabled?: boolean;
  serviceToken?: string;
  generateServiceToken: () => void;
  isLoadingServiceToken: boolean;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepGenerateServiceTokenTitle', {
      defaultMessage: 'Generate a service token',
    }),
    status: disabled ? 'disabled' : undefined,
    children: !disabled && (
      <GenerateServiceTokenComponent
        serviceToken={serviceToken}
        generateServiceToken={generateServiceToken}
        isLoadingServiceToken={isLoadingServiceToken}
      />
    ),
  };
};
