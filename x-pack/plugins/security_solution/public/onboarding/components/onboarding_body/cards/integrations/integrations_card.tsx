/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiSpacer, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { CardCallOut } from '../common/card_callout';
import { AvailablePackages } from './available_packages';
import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';
import { LinkAnchor } from '../../../../../common/components/links';
import { useKibana } from '../../../../../common/lib/kibana';

export const IntegrationsCard: OnboardingCardComponent = ({
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  const integrationsInstalled: number | undefined = checkCompleteMetadata?.integrationsInstalled as
    | number
    | undefined;
  const { href, onClick } = useAddIntegrationsUrl();
  const { navigateToApp } = useKibana().services.application;
  const onAddAgentClick = useCallback(() => {
    navigateToApp('fleet', { path: '/agents' });
  }, [navigateToApp]);

  return (
    <OnboardingCardContentPanel>
      {integrationsInstalled && (
        <>
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
                      id="xpack.securitySolution.onboarding.integrationsCard.callout.completeText"
                      defaultMessage="{count} {count, plural, one {integration has} other {integrations have}} been added"
                      values={{ count: integrationsInstalled }}
                    />
                  ),
                  desc2: checkCompleteMetadata?.agentStillRequired ? (
                    <LinkAnchor onClick={onAddAgentClick}>
                      <FormattedMessage
                        id="xpack.securitySolution.onboarding.integrationsCard.agent.link"
                        defaultMessage="here"
                      />
                    </LinkAnchor>
                  ) : (
                    <LinkAnchor onClick={onClick} href={href}>
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

          <EuiSpacer size="m" />
        </>
      )}
      <AvailablePackages />
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
