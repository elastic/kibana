/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIcon } from '@elastic/eui';

import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';
import { LinkAnchor } from '../../../../../common/components/links';
import { CardCallOut } from '../common/card_callout';

export const PackageInstalledCallout = React.memo(
  ({
    addAgentLink,
    checkCompleteMetadata,
    onAddAgentClick,
  }: {
    addAgentLink: string;
    checkCompleteMetadata: Record<string, unknown> | undefined;
    onAddAgentClick: () => void;
  }) => {
    const { href: integrationUrl, onClick: onAddIntegrationClicked } = useAddIntegrationsUrl();
    const integrationsInstalled: number = checkCompleteMetadata?.integrationsInstalled as number;

    return (
      <CardCallOut
        color={checkCompleteMetadata?.agentStillRequired ? 'warning' : 'primary'}
        text={
          <FormattedMessage
            id="xpack.securitySolution.onboarding.integrationsCard.callout.completeLabel"
            defaultMessage={`
      {desc1} {desc2} {icon}
    `}
            values={{
              desc1: checkCompleteMetadata?.agentStillRequired ? (
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.integrationsCard.agent.text"
                  defaultMessage="Elastic Agent is required for one or more of your integrations. Add Elastic Agent"
                />
              ) : (
                <FormattedMessage
                  data-test-subj="integrationsCompleteText"
                  id="xpack.securitySolution.onboarding.integrationsCard.callout.completeText"
                  defaultMessage="{count} {count, plural, one {integration has} other {integrations have}} been added"
                  values={{ count: integrationsInstalled }}
                />
              ),
              desc2: checkCompleteMetadata?.agentStillRequired ? (
                <LinkAnchor
                  href={addAgentLink}
                  onClick={onAddAgentClick}
                  data-test-subj="agentLink"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.onboarding.integrationsCard.agent.link"
                    defaultMessage="here"
                  />
                </LinkAnchor>
              ) : (
                <LinkAnchor
                  onClick={onAddIntegrationClicked}
                  href={integrationUrl}
                  data-test-subj="manageIntegrationsLink"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.onboarding.integrationsCard.button.completeLink"
                    defaultMessage="Manage integrations"
                  />
                </LinkAnchor>
              ),
              icon: <EuiIcon type="arrowRight" size="s" />,
            }}
          />
        }
      />
    );
  }
);

PackageInstalledCallout.displayName = 'PackageInstalledCallout';
