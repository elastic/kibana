/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

export function ClientSideMonitoringCallout() {
  const { core } = useApmPluginContext();
  const clientSideMonitoringHref = core.http.basePath.prepend(`/app/csm`);

  return (
    <EuiCallOut
      iconType="cheer"
      title={i18n.translate(
        'xpack.apm.transactionOverview.clientSideMonitoring.calloutTitle',
        { defaultMessage: 'New app: Client Side Monitoring' }
      )}
    >
      <EuiText>
        {i18n.translate(
          'xpack.apm.transactionOverview.clientSideMonitoring.calloutText',
          {
            defaultMessage:
              'We are introducing a new app which contains breakdown information around browser and location by page load.',
          }
        )}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton href={clientSideMonitoringHref}>
        {i18n.translate(
          'xpack.apm.transactionOverview.clientSideMonitoring.linkLabel',
          { defaultMessage: 'Learn more' }
        )}
      </EuiButton>
    </EuiCallOut>
  );
}
