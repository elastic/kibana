/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { CardCallOut } from '../common/card_callout';
import { AvailablePackages } from './available_packages';
import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';
import { LinkAnchor } from '../../../../../common/components/links';

export const IntegrationsCard: OnboardingCardComponent = ({
  setComplete,
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  const integrationsInstalled: number | undefined = checkCompleteMetadata?.integrationsInstalled;
  const { href, onClick } = useAddIntegrationsUrl();

  return (
    <OnboardingCardContentPanel>
      {integrationsInstalled && (
        <>
          <CardCallOut
            color="primary"
            text={
              <FormattedMessage
                id="xpack.securitySolution.onboarding.integrationsCard.callout.completeLabel"
                defaultMessage={`
      {desc1} {desc2}
    `}
                values={{
                  desc1: (
                    <FormattedMessage
                      id="xpack.securitySolution.onboarding.integrationsCard.callout.completeText"
                      defaultMessage="{count} {count, plural, one {integration has} other {integrations have}} been added"
                      values={{ count: integrationsInstalled }}
                    />
                  ),
                  desc2: (
                    <LinkAnchor onClick={onClick} href={href}>
                      <FormattedMessage
                        id="xpack.securitySolution.onboarding.integrationsCard.button.completeLink"
                        defaultMessage="Manage integrations"
                      />
                      <EuiIcon type="arrowRight" size="s" />
                    </LinkAnchor>
                  ),
                }}
              />
            }
          />

          <EuiSpacer size="m" />
        </>
      )}
      <AvailablePackages setComplete={setComplete} />
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
