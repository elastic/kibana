/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlyout, EuiHeaderLinks } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  KibanaWiredConnectionDetailsProvider,
  ConnectionDetailsFlyoutContent,
} from '@kbn/cloud/connection_details';

export const EndpointsHeaderAction = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <EuiHeaderLinks>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiButtonEmpty
            iconType="endpoint"
            size="s"
            onClick={() => setOpen(true)}
            data-test-subj="searchHomepageEndpointsHeaderActionEndpointsApiKeysButton"
            data-telemetry-id="searchHomepageEndpointsHeaderActionEndpointsApiKeysButton"
          >
            <FormattedMessage
              id="xpack.searchHomepage.header.endpointsButtonLabel"
              defaultMessage="Endpoints & API keys"
            />
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiHeaderLinks>
      {open && (
        <EuiFlyout onClose={() => setOpen(false)} size="s">
          <KibanaWiredConnectionDetailsProvider>
            <ConnectionDetailsFlyoutContent />
          </KibanaWiredConnectionDetailsProvider>
        </EuiFlyout>
      )}
    </>
  );
};
