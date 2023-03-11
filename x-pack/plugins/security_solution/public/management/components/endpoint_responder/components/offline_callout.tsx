/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useGetEndpointDetails } from '../../../hooks';
import { HostStatus } from '../../../../../common/endpoint/types';

interface OfflineCalloutProps {
  endpointId: string;
}

export const OfflineCallout = memo<OfflineCalloutProps>(({ endpointId }) => {
  const { data: endpointDetails } = useGetEndpointDetails(endpointId, {
    refetchInterval: 10000,
  });

  if (!endpointDetails) {
    return null;
  }

  if (endpointDetails.host_status === HostStatus.OFFLINE) {
    return (
      <>
        <EuiCallOut
          iconType="offline"
          color="warning"
          data-test-subj="offlineCallout"
          title={i18n.translate('xpack.securitySolution.responder.hostOffline.callout.title', {
            defaultMessage: 'Host Offline',
          })}
        >
          <p>
            <FormattedMessage
              id="xpack.securitySolution.responder.hostOffline.callout.body"
              defaultMessage="The host {name} is offline, so its responses may be delayed. Pending commands will execute when the host reconnects."
              values={{ name: <strong>{endpointDetails.metadata.host.name}</strong> }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  return null;
});

OfflineCallout.displayName = 'OfflineCallout';
