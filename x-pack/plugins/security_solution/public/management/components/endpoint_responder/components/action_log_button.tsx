/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EndpointResponderExtensionComponentProps } from '../types';
import { ResponseActionsLog } from '../../endpoint_response_actions_list/response_actions_log';
import { UX_MESSAGES } from '../../endpoint_response_actions_list/translations';

export const ActionLogButton = memo<EndpointResponderExtensionComponentProps>((props) => {
  const { euiTheme } = useEuiTheme();
  const [showActionLogFlyout, setShowActionLogFlyout] = useState<boolean>(false);
  const toggleActionLog = useCallback(() => {
    setShowActionLogFlyout((prevState) => {
      return !prevState;
    });
  }, []);

  const responderActionLogFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'responderActionLogFlyoutTitle',
  });

  return (
    <>
      <EuiButton
        onClick={toggleActionLog}
        disabled={showActionLogFlyout}
        iconType="list"
        data-test-subj="responderShowActionLogButton"
      >
        <FormattedMessage
          id="xpack.securitySolution.responseActionsHistoryButton.label"
          defaultMessage="Response actions history"
        />
      </EuiButton>
      {showActionLogFlyout && (
        <EuiFlyout
          onClose={toggleActionLog}
          size="m"
          paddingSize="l"
          aria-labelledby={responderActionLogFlyoutTitleId}
          data-test-subj="responderActionLogFlyout"
          // EUI TODO: This z-index override of EuiOverlayMask is a workaround, and ideally should be resolved with a cleaner UI/UX flow long-term
          maskProps={{ style: `z-index: ${(euiTheme.levels.flyout as number) + 3}` }} // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h1 id={responderActionLogFlyoutTitleId}>
                {UX_MESSAGES.flyoutTitle(props.meta.hostName)}
              </h1>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ResponseActionsLog agentIds={props.meta.agentId} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
});
ActionLogButton.displayName = 'ActionLogButton';
