/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { HostsPage } from '../hosts';
import { EnableHostViewPage } from './enable_host_view_page';

export const HostsLandingPage = () => {
  const kibana = useKibana();
  const canEditAdvancedSettings = kibana.services.application?.capabilities.advancedSettings.save;
  const [isHostViewEnabled, setIsHostViewEnabled] = useState<boolean | undefined>(undefined);

  const ROLE = i18n.translate('xpack.infra.hostsLandingPage.role', {
    defaultMessage: 'role',
  });

  useEffect(() => {
    setIsHostViewEnabled(
      kibana.services.uiSettings?.get('observability:enableInfrastructureHostsView')
    );
  }, [isHostViewEnabled, kibana.services.uiSettings]);

  if (isHostViewEnabled) {
    return <HostsPage />;
  }

  if (canEditAdvancedSettings) {
    return (
      <EnableHostViewPage
        actions={
          <EuiButton
            iconType="check"
            color="primary"
            data-test-subj="hostsView-enable-feature-button"
            onClick={() => {
              kibana.services.uiSettings?.set('observability:enableInfrastructureHostsView', true);
              setIsHostViewEnabled(true);
            }}
          >
            {i18n.translate('xpack.infra.hostsLandingPage.role', {
              defaultMessage: 'Enable hosts view',
            })}
          </EuiButton>
        }
      />
    );
  }

  return (
    <EnableHostViewPage
      actions={
        <EuiCallOut data-test-subj="hostView-no-enable-access" size="s" color="warning">
          <p>
            {i18n.translate(
              'xpack.infra.hostsLandingPage.calloutReachOutToYourKibanaAdministrator',
              {
                defaultMessage: `Your user role doesn’t have sufficient privileges to enable this feature - please 
                reach out to your Kibana Administrator and ask them to visit this page to enable this feature.`,
              }
            )}
          </p>
          <p>
            <FormattedMessage
              id="xpack.infra.hostsLandingPage.calloutRoleClarificationWithDocsLink"
              defaultMessage="They will need a {docsLink} with Kibana > Management > Advanced Settings > All permissions."
              values={{
                docsLink: (
                  <EuiLink href="https://www.elastic.co/guide/en/kibana/current/kibana-privileges.html#kibana-feature-privileges">
                    {ROLE}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      }
    />
  );
};
