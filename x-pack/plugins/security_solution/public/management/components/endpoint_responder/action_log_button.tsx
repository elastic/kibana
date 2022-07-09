/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButton, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EndpointResponderExtensionComponentProps } from './types';
import { ResponseActionsList } from '../endpoint_response_actions_list/response_actions_list';
import { UX_MESSAGES } from '../endpoint_response_actions_list/translations';

export const ActionLogButton = memo<EndpointResponderExtensionComponentProps>((props) => {
  const [showActionLogFlyout, setShowActionLogFlyout] = useState<boolean>(false);
  const toggleActionLog = useCallback(() => {
    setShowActionLogFlyout((prevState) => {
      return !prevState;
    });
  }, []);

  return (
    <>
      <EuiButton onClick={toggleActionLog} disabled={showActionLogFlyout} iconType="list">
        <FormattedMessage
          id="xpack.securitySolution.actionLogButton.label"
          defaultMessage="Action log"
        />
      </EuiButton>
      {showActionLogFlyout && (
        <EuiFlyout onClose={toggleActionLog} size="m" paddingSize="l">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h1>{UX_MESSAGES.flyoutTitle(props.meta.endpoint.host.hostname)}</h1>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ResponseActionsList agentIds={props.meta.endpoint.agent.id} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
});
ActionLogButton.displayName = 'ActionLogButton';
