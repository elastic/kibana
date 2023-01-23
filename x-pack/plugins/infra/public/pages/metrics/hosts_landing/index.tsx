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
import { HostsPage } from '../hosts';
import { EnableHostViewPage } from './enable_host_view_page';

export const HostsLandingPage = () => {
  const kibana = useKibana();
  const canEditAdvancedSettings = kibana.services.application?.capabilities.advancedSettings.save;
  const [isHostViewEnabled, setIsHostViewEnabled] = useState<boolean | undefined>(undefined);

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
            color="primary"
            data-test-subj="hostsView-enable-feature-button"
            onClick={() => {
              kibana.services.uiSettings?.set('observability:enableInfrastructureHostsView', true);
              setIsHostViewEnabled(true);
            }}
          >
            Enable hosts view
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
            Your user role doesn’t have sufficient privileges to enable this feature - please reach
            out to your Kibana Administrator and ask them to visit this page to enable this feature.
          </p>
          <p>
            They will need a{' '}
            <EuiLink href="https://www.elastic.co/guide/en/kibana/current/kibana-privileges.html#kibana-feature-privileges">
              role
            </EuiLink>{' '}
            with Kibana &gt; Management &gt; Advanced Settings &gt; All permissions.
          </p>
        </EuiCallOut>
      }
    />
  );
};
