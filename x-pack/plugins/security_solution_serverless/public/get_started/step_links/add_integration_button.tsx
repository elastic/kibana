/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { useNavigation } from '@kbn/security-solution-navigation';

const AddIntegrationButtonComponent = () => {
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
    <EuiButton onClick={onClick} fill>
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.description2.button"
        defaultMessage="Add integrations"
      />
    </EuiButton>
  );
};

export const AddIntegrationButton = React.memo(AddIntegrationButtonComponent);
