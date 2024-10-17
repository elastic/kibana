/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAdd3PIntegrationRoute } from '../../common/api/use_wiz_integration_route';
import { LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY } from '../../common/constants';

export const ThirdPartyIntegrationsCallout = () => {
  const wizAddIntegrationLink = useAdd3PIntegrationRoute('wiz');
  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY
  );

  if (userHasDismissedCallout) return null;

  return (
    <EuiCallOut
      title={i18n.translate('xpack.csp.findings.3pIntegrationsCallout.title', {
        defaultMessage:
          "New! Ingest your cloud security product's data into Elastic for centralized analytics, hunting, investigations, visualizations, and more",
      })}
      iconType="cheer"
      onDismiss={() => setUserHasDismissedCallout(true)}
    >
      <EuiButton href={wizAddIntegrationLink}>
        <FormattedMessage
          id="xpack.csp.findings.3pIntegrationsCallout.buttonTitle"
          defaultMessage="Integrate Wiz"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
