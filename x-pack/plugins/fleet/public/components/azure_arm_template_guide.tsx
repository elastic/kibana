/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CloudSecurityIntegrationAzureAccountType } from './agent_enrollment_flyout/types';

const AzureResourceManagerLink =
  'https://azure.microsoft.com/en-us/get-started/azure-portal/resource-manager/?OCID=AIDcmm5edswduu_SEM__k_CjwKCAjwxOymBhAFEiwAnodBLBHx_IB6zMNtNiK3A6rPLhhUPeftXrN3px5mwTO739pWUndPzt27aRoCMKIQAvD_BwE_k_&gad=1';

export const AzureArmTemplateGuide = ({
  azureAccountType,
}: {
  azureAccountType?: CloudSecurityIntegrationAzureAccountType;
}) => {
  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.fleet.azureArmTemplate.guide.description"
          defaultMessage="An Azure Resource Manager (ARM) Template will create all the necessary resources to evaluate the security posture of your Azure organization. Follow the steps below to launch the ARM template. Learn more about {learnMore}."
          values={{
            learnMore: (
              <EuiLink
                href={AzureResourceManagerLink}
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
          {azureAccountType === 'organization-account-azure' ? (
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
        </ol>
      </EuiText>
    </EuiText>
  );
};
