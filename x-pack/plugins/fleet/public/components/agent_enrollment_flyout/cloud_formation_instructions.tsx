/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useCreateCloudFormationUrl } from '../../hooks';
import { CloudFormationGuide } from '../cloud_formation_guide';

import type { CloudSecurityIntegration } from './types';

interface Props {
  enrollmentAPIKey?: string;
  cloudSecurityIntegration: CloudSecurityIntegration;
}

export const CloudFormationInstructions: React.FunctionComponent<Props> = ({
  enrollmentAPIKey,
  cloudSecurityIntegration,
}) => {
  const { isLoading, cloudFormationUrl, error, isError } = useCreateCloudFormationUrl({
    enrollmentAPIKey,
    cloudFormationProps: cloudSecurityIntegration?.cloudFormationProps,
  });

  if (error && isError) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut title={error} color="danger" iconType="error" />
      </>
    );
  }

  return (
    <EuiSkeletonText
      lines={3}
      size="m"
      isLoading={isLoading || cloudSecurityIntegration?.isLoading}
      contentAriaLabel={i18n.translate(
        'xpack.fleet.agentEnrollment.cloudFormation.loadingAriaLabel',
        {
          defaultMessage: 'Loading CloudFormation instructions',
        }
      )}
    >
      <CloudFormationGuide
        awsAccountType={cloudSecurityIntegration?.cloudFormationProps?.awsAccountType}
      />
      <EuiSpacer size="m" />
      <EuiButton
        color="primary"
        fill
        target="_blank"
        iconSide="left"
        iconType="launch"
        fullWidth
        href={cloudFormationUrl}
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.cloudFormation.launchButton"
          defaultMessage="Launch CloudFormation"
        />
      </EuiButton>
    </EuiSkeletonText>
  );
};
