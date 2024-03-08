/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiDescriptionList, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy } from '../../../common';
import { useFleetServerHostsForPolicy } from '../../hooks';

import { useAgentPolicyWithPackagePolicies } from '../agent_enrollment_flyout/hooks';
import type { CloudSecurityIntegrationAzureAccountType } from '../agent_enrollment_flyout/types';

const azureResourceManagerLink =
  'https://azure.microsoft.com/en-us/get-started/azure-portal/resource-manager';

export const AzureArmTemplateGuide = ({
  azureAccountType,
  agentPolicy,
  enrollmentToken = '',
}: {
  azureAccountType?: CloudSecurityIntegrationAzureAccountType;
  agentPolicy?: AgentPolicy;
  enrollmentToken?: string;
}) => {
  const { agentPolicyWithPackagePolicies } = useAgentPolicyWithPackagePolicies(agentPolicy?.id);
  const { fleetServerHosts } = useFleetServerHostsForPolicy(agentPolicyWithPackagePolicies);
  const fleetServerHost = fleetServerHosts[0];

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.fleet.azureArmTemplate.guide.description"
          defaultMessage="An Azure Resource Manager (ARM) Template will create all the necessary resources to evaluate the security posture of your Azure organization. Follow the steps below to launch the ARM template. Learn more about {learnMore}."
          values={{
            learnMore: (
              <EuiLink
                href={azureResourceManagerLink}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="azure-resource-manager-link"
              >
                <FormattedMessage
                  id="xpack.fleet.azureArmTemplate.guide.learnMoreLinkText"
                  defaultMessage="Azure Resource Manager"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
      <EuiText size="s" color="subdued">
        <ol>
          {azureAccountType === 'organization-account' ? (
            <li>
              <FormattedMessage
                id="xpack.fleet.azureArmTemplate.guide.steps.organizationLogin"
                defaultMessage="Log into your Azure Portal"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.fleet.azureArmTemplate.guide.steps.login"
                defaultMessage="Log into your Azure Portal"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="xpack.fleet.azureArmTemplate.guide.steps.launch"
              defaultMessage="Click the Launch ARM Template button below."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.azureArmTemplate.guide.steps.fillForm"
              defaultMessage="Use the provided fields below to fill the instance details section of the ARM Template:"
            />
            <EuiSpacer />
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Fleet URL',
                  description: (
                    <EuiCodeBlock isCopyable paddingSize="m">
                      {fleetServerHost}
                    </EuiCodeBlock>
                  ),
                },
                {
                  title: 'Enrollment Token',
                  description: (
                    <EuiCodeBlock isCopyable paddingSize="m">
                      {enrollmentToken}
                    </EuiCodeBlock>
                  ),
                },
              ]}
            />
          </li>
        </ol>
      </EuiText>
    </EuiText>
  );
};
