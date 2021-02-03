/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiCard, EuiIcon, EuiTextColor, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

const LockedPolicyDiv = styled.div`
  .euiCard__betaBadgeWrapper {
    .euiCard__betaBadge {
      width: auto;
    }
  }
`;

export const LockedPolicyCard = memo(() => {
  return (
    <LockedPolicyDiv>
      <EuiCard
        data-test-subj="lockedPolicyCard"
        betaBadgeLabel={i18n.translate('xpack.securitySolution.endpoint.policy.details.platinum', {
          defaultMessage: 'Platinum',
        })}
        isDisabled={true}
        icon={<EuiIcon size="xl" type="lock" />}
        title={
          <h3>
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.details.ransomware"
                defaultMessage="Ransomware"
              />
            </strong>
          </h3>
        }
        description={
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <h4>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policy.details.upgradeToPlatinum"
                    defaultMessage="Upgrade to Elastic Platinum"
                  />
                </EuiTextColor>
              </h4>
            </EuiFlexItem>
            <EuiFlexItem>
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
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </LockedPolicyDiv>
  );
});
LockedPolicyCard.displayName = 'LockedPolicyCard';
