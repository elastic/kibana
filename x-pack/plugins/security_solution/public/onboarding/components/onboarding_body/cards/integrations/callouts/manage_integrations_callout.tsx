/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIcon } from '@elastic/eui';

import { LinkAnchor } from '../../../../../../common/components/links';
import { CardCallOut } from '../../common/card_callout';
import { useAddIntegrationsUrl } from '../../../../../../common/hooks/use_add_integrations_url';
import { trackOnboardingLinkClick } from '../../../../../common/lib/telemetry';
import { TELEMETRY_MANAGE_INTEGRATIONS } from '../constants';

export const ManageIntegrationsCallout = React.memo(
  ({ installedIntegrationsCount }: { installedIntegrationsCount: number }) => {
    const { href: integrationUrl, onClick: onAddIntegrationClicked } = useAddIntegrationsUrl();

    const onClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        trackOnboardingLinkClick(TELEMETRY_MANAGE_INTEGRATIONS);
        onAddIntegrationClicked(e);
      },
      [onAddIntegrationClicked]
    );

    if (!installedIntegrationsCount) {
      return null;
    }

    return (
      <CardCallOut
        color="primary"
        text={
          <FormattedMessage
            data-test-subj="integrationsCompleteText"
            id="xpack.securitySolution.onboarding.integrationsCard.callout.completeLabel"
            defaultMessage={`
      {desc} {link} {icon}
    `}
            values={{
              desc: (
                <FormattedMessage
                  data-test-subj="integrationsCompleteText"
                  id="xpack.securitySolution.onboarding.integrationsCard.callout.completeText"
                  defaultMessage="{count} {count, plural, one {integration has} other {integrations have}} been added"
                  values={{ count: installedIntegrationsCount }}
                />
              ),
              link: (
                <LinkAnchor
                  onClick={onClick}
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

ManageIntegrationsCallout.displayName = 'ManageIntegrationsCallout';
