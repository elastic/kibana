/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButton, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EndpointResponderExtensionComponentProps } from './types';
import { ResponseActionsList } from '../../pages/response_actions/view/response_actions_list';
import { UX_MESSAGES } from '../../pages/response_actions/translations';

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
        <EuiFlyout onClose={toggleActionLog} size="l">
          <EuiFlyoutHeader>
            <EuiTitle size="s">
              <h2>{UX_MESSAGES.flyoutTitle(props.meta.endpoint.host.hostname)}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ResponseActionsList hideHeader agentIds={props.meta.endpoint.agent.id} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
});
ActionLogButton.displayName = 'ActionLogButton';
