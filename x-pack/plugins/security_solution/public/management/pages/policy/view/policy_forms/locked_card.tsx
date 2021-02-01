/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiCard, EuiIcon, EuiTitle, EuiText, EuiTextColor, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

const CenteredDescription = styled.div`
  width: ${(props) => props.theme.eui.fractions.halves.percentage};
  margin: 0 auto;
`;

export const LockedPolicyCard = memo(() => {
  return (
    <EuiCard
      data-test-subj="lockedPolicyCard"
      betaBadgeLabel={i18n.translate('xpack.securitySolution.endpoint.policy.details.platinum', {
        defaultMessage: 'Platinum',
      })}
      icon={<EuiIcon size="xl" type="lock" color="subdued" />}
      title={
        <h3>
          <EuiTextColor color="subdued">
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.details.ransomware"
                defaultMessage="Ransomware"
              />
            </strong>
          </EuiTextColor>
        </h3>
      }
      description={
        <CenteredDescription>
          <EuiText size="s" color="subdued">
            <h4>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.details.upgradeToPlatinum"
                  defaultMessage="Upgrade to Elastic Platinum"
                />
              </EuiTextColor>
            </h4>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.details.lockedCard"
                defaultMessage="To turn on Ransomware protection, you must upgrade your license to Platinum, start a
            free 30-day trial, or spin up a {cloudDeploymentLink} on AWS, GCP, or Azure."
                values={{
                  cloudDeploymentLink: (
                    <EuiLink href="https://www.elastic.co/cloud/" target="_blank">
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policy.details.cloudDeploymentLInk"
                        defaultMessage="cloud deployment"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </CenteredDescription>
      }
    />
  );
});
LockedPolicyCard.displayName = 'LockedPolicyCard';
