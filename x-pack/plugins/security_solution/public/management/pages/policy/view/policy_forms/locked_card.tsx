/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiCard, EuiIcon, EuiTitle, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';

const CenteredDescription = styled.div`
  width: ${(props) => props.theme.eui.fractions.thirds.percentage};
  margin: 0 auto;
`;

export const LockedPolicyCard = memo(() => {
  return (
    <EuiCard
      data-test-subj="lockedPolicyCard"
      betaBadgeLabel="Platinum"
      icon={<EuiIcon size="xl" type="lock" />}
      title="Ransomware"
      description={
        <CenteredDescription>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.details.upgradeToPlatinum"
                defaultMessage="Upgrade to Elastic Platinum"
              />
            </h5>
          </EuiTitle>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.details.lockedCard"
                defaultMessage="To turn on Ransomware protection, you must upgrade your license to Platinum, start a
            free 30-day trial, or spin up a cloud deployment on AWS, GCP, or Azure."
              />
            </p>
          </EuiText>
        </CenteredDescription>
      }
    />
  );
});
LockedPolicyCard.displayName = 'LockedPolicyCard';
