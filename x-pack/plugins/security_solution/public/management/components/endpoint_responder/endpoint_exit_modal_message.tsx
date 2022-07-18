/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import type { HostMetadata } from '../../../../common/endpoint/types';
import { ConsoleExitModalInfo, HostNameText } from './console_exit_modal_info';

export const EndpointExitModalMessage = memo(({ meta }: { meta: { endpoint: HostMetadata } }) => {
  return (
    <>
      <ConsoleExitModalInfo hostName={meta.endpoint.host.hostname} />
      <EuiSpacer size="l" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.consolePageOverlay.exitModal.body"
          defaultMessage="Access it here : {linkText}"
          values={{
            linkText: (
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.consolePageOverlay.exitModal.linkText"
                  defaultMessage="Manage> Endpoints> {hostName}> Action log."
                  values={{
                    hostName: <HostNameText hostName={meta.endpoint.host.hostname} />,
                  }}
                />
              </strong>
            ),
          }}
        />
      </EuiText>
    </>
  );
});

EndpointExitModalMessage.displayName = 'EndpointExitModalMessage';
