/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiSpacer, EuiIcon, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useObservable } from 'react-use';
import { css } from '@emotion/react';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { CardCallOut } from '../common/card_callout';
import { AvailablePackages } from './available_packages';
import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';
import { LinkAnchor } from '../../../../../common/components/links';
import { useKibana } from '../../../../../common/lib/kibana';
import { useOnboardingService } from '../../../../hooks/use_onboarding_service';

export const IntegrationsCard: OnboardingCardComponent = ({
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  const integrationsInstalled: number = checkCompleteMetadata?.integrationsInstalled as number;
  const { href, onClick } = useAddIntegrationsUrl();
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const { isAgentlessAvailable$ } = useOnboardingService();
  const isAgentlessAvailable = useObservable(isAgentlessAvailable$, undefined);
  const { euiTheme } = useEuiTheme();

  const onAddAgentClick = useCallback(() => {
    navigateToApp('fleet', { path: '/agents' });
  }, [navigateToApp]);

  return (
    <OnboardingCardContentPanel>
      {!integrationsInstalled && isAgentlessAvailable && (
        <>
          <CardCallOut
            color="danger"
            text={
              <FormattedMessage
                id="xpack.securitySolution.onboarding.integrationsCard.callout.agentLessAvailableLabel"
                defaultMessage={`{icon} {new} {text} {link}`}
                values={{
                  icon: <EuiIcon type="cheer" size="s" />,
                  new: (
                    <FormattedMessage
                      id="xpack.securitySolution.onboarding.integrationsCard.callout.agentLessAvailableNewLabel"
                      defaultMessage="New"
                      css={css`
                        font-weight: ${euiTheme.font.weight.bold};
                      `}
                    />
                  ),
                  text: (
                    <FormattedMessage
                      id="xpack.securitySolution.onboarding.integrationsCard.callout.agentLessAvailableText"
                      defaultMessage="Identify configuration risks in your cloud account with new and simplified agentless configuration"
                    />
                  ),
                  link: (
                    <LinkAnchor onClick={onClick} data-test-subj="agentlessLearnMoreLink" external>
                      <FormattedMessage
                        id="xpack.securitySolution.onboarding.integrationsCard.button.agentlessLearnMoreLink"
                        defaultMessage="Learn more"
                      />
                    </LinkAnchor>
                  ),
                }}
              />
            }
          />
          <EuiSpacer size="m" />
        </>
      )}
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
                      data-test-subj="agentRequiredText"
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
                    <LinkAnchor onClick={onAddAgentClick} data-test-subj="agentLink">
                      <FormattedMessage
                        id="xpack.securitySolution.onboarding.integrationsCard.agent.link"
                        defaultMessage="here"
                      />
                    </LinkAnchor>
                  ) : (
                    <LinkAnchor
                      onClick={onClick}
                      href={href}
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
          <EuiSpacer size="m" />
        </>
      )}
      <AvailablePackages />
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
