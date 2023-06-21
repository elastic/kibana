/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { InfraClientStartDeps } from '../../../types';
import { EnableHostsViewPage } from './components/enable_hosts_view_page/enable_hosts_view_page';
import { HostsPage } from '.';

export const HostsLandingPage = () => {
  const {
    services: { uiSettings, application },
  } = useKibana<InfraClientStartDeps>();
  const canEditAdvancedSettings = application?.capabilities.advancedSettings.save;
  const isHostViewEnabled = useObservable<boolean>(
    uiSettings?.get$<boolean>(enableInfrastructureHostsView) ??
      new Observable((subs) => subs.next(false))
  );

  if (isHostViewEnabled) {
    return <HostsPage />;
  }

  if (canEditAdvancedSettings) {
    return (
      <EnableHostsViewPage
        actions={
          <EuiButton
            iconType="check"
            color="primary"
            data-test-subj="hostsView-enable-feature-button"
            onClick={() => {
              uiSettings?.set(enableInfrastructureHostsView, true);
            }}
          >
            {i18n.translate('xpack.infra.hostsViewPage.landing.enableHostsView', {
              defaultMessage: 'Enable hosts view',
            })}
          </EuiButton>
        }
      />
    );
  }

  return (
    <EnableHostsViewPage
      actions={
        <EuiCallOut data-test-subj="hostView-no-enable-access" size="s" color="warning">
          <p>
            {i18n.translate(
              'xpack.infra.hostsViewPage.landing.calloutReachOutToYourKibanaAdministrator',
              {
                defaultMessage: `Your user role doesn’t have sufficient privileges to enable this feature - please 
                reach out to your Kibana Administrator and ask them to visit this page to enable this feature.`,
              }
            )}
          </p>
          <p>
            <FormattedMessage
              id="xpack.infra.hostsViewPage.landing.calloutRoleClarificationWithDocsLink"
              defaultMessage="They will need a role with access to Advanced settings in Kibana. {docsLink}"
              values={{
                docsLink: (
                  <EuiLink
                    target="_blank"
                    data-test-subj="hostsView-docs-link"
                    href="https://www.elastic.co/guide/en/kibana/current/kibana-privileges.html#kibana-feature-privileges"
                  >
                    {i18n.translate('xpack.infra.hostsViewPage.landing.learnMore', {
                      defaultMessage: 'Learn more',
                    })}
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
