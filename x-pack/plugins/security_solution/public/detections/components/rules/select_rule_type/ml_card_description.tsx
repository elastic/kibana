/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import styled from 'styled-components';
import React from 'react';

import { ML_TYPE_DESCRIPTION } from './translations';

interface MlCardDescriptionProps {
  subscriptionUrl: string;
  hasValidLicense?: boolean;
}

const SmallText = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

const MlCardDescriptionComponent: React.FC<MlCardDescriptionProps> = ({
  subscriptionUrl,
  hasValidLicense = false,
}) => (
  <SmallText>
    {hasValidLicense ? (
      ML_TYPE_DESCRIPTION
    ) : (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.mlTypeDisabledDescription"
        defaultMessage="Access to ML requires a {subscriptionsLink}."
        values={{
          subscriptionsLink: (
            <EuiLink href={subscriptionUrl} target="_blank">
              <FormattedMessage
                id="xpack.securitySolution.components.stepDefineRule.ruleTypeField.subscriptionsLink"
                defaultMessage="Platinum subscription"
              />
            </EuiLink>
          ),
        }}
      />
    )}
  </SmallText>
);

MlCardDescriptionComponent.displayName = 'MlCardDescriptionComponent';

export const MlCardDescription = React.memo(MlCardDescriptionComponent);

MlCardDescription.displayName = 'MlCardDescription';
