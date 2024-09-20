/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiLink, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { CardCallOut } from '../common/card_callout';
import { AvailablePackages } from './available_packages';
import { useAddIntegrationsUrl } from '../../../../../common/hooks/use_add_integrations_url';

export const IntegrationsCard: OnboardingCardComponent = ({
  setComplete,
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  const integrationsInstalled: number | undefined = checkCompleteMetadata?.integrationsInstalled;
  const { onClick } = useAddIntegrationsUrl();

  return (
    <OnboardingCardContentPanel>
      {integrationsInstalled && (
        <>
          <CardCallOut
            color="primary"
            text={
              <>
                {i18n.translate(
                  'xpack.securitySolution.onboarding.integrationsCard.callout.completeText',
                  {
                    defaultMessage:
                      '{count} {count, plural, one {integration has} other {integrations have}} been added',
                    values: { count: integrationsInstalled },
                  }
                )}{' '}
                <EuiLink onClick={onClick}>
                  {i18n.translate(
                    'xpack.securitySolution.onboarding.integrationsCard.button.completeLink',
                    {
                      defaultMessage: 'Manage integrations',
                    }
                  )}
                  <EuiIcon type="arrowRight" size="s" />
                </EuiLink>
              </>
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
