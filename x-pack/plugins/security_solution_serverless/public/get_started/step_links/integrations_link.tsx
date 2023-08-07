/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { useNavigation } from '@kbn/security-solution-navigation';

const IntegrationsLinkComponent = () => {
  const { getAppUrl, navigateTo } = useNavigation();

  const integrationsUrl = getAppUrl({ appId: 'integrations', path: '/browse/security' });
  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      // TODO: telemetry https://github.com/elastic/kibana/issues/163247
      navigateTo({ url: integrationsUrl });
    },
    [navigateTo, integrationsUrl]
  );
  return (
    <FormattedMessage
      id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.description2.linkText"
      defaultMessage="Go to {integrations} to ingest your own data!"
      values={{
        integrations: (
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiLink onClick={onClick} href={integrationsUrl}>
            <FormattedMessage
              id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.description2.link"
              defaultMessage="Integrations"
            />
          </EuiLink>
        ),
      }}
    />
  );
};

export const IntegrationsLink = React.memo(IntegrationsLinkComponent);
