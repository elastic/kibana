/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import {
  EuiBetaBadge,
  EuiEmptyPrompt,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { getEndpointListPath } from '../../../management/common/routing';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useManagementFormatUrl } from '../../../management/components/hooks/use_management_format_url';
import { MANAGEMENT_APP_ID } from '../../../management/common/constants';

const EMPTY_PROMPT_STYLE = Object.freeze({ maxWidth: '100%' });

export const EndpointNotice = memo<{ onDismiss: () => void }>(({ onDismiss }) => {
  const endpointsPath = getEndpointListPath({ name: 'endpointList' });
  const endpointsLink = useManagementFormatUrl(endpointsPath);
  const handleGetStartedClick = useNavigateToAppEventHandler(MANAGEMENT_APP_ID, {
    path: endpointsPath,
  });

  return (
    <EuiPanel>
      <EuiButtonIcon onClick={onDismiss} iconType="cross" />
      <EuiEmptyPrompt
        data-test-subj="endpoint-prompt-banner"
        style={EMPTY_PROMPT_STYLE}
        iconType="logoSecurity"
        title={
          <>
            <EuiBetaBadge
              label={i18n.translate('xpack.securitySolution.overview.endpointNotice.betaLabel', {
                defaultMessage: 'beta',
              })}
            />
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.overview.endpointNotice.title"
                  defaultMessage="Looks like you're not using Endpoint Security"
                />
              </h2>
            </EuiTitle>
          </>
        }
        titleSize="xs"
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.overview.endpointNotice.message"
                defaultMessage="Elastic Endpoint Security gives you the power to keep your endpoints safe from attack, as well as unparalleled visibility into any threat in your environment. {getStartedLink}"
                values={{
                  getStartedLink: (
                    // eslint-disable-next-line @elastic/eui/href-or-on-click
                    <EuiLink onClick={handleGetStartedClick} href={endpointsLink}>
                      <FormattedMessage
                        id="xpack.securitySolution.overview.endpointNotice.getStartedLinkTitle"
                        defaultMessage="Click here to get started!"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </>
        }
      />
    </EuiPanel>
  );
});
EndpointNotice.displayName = 'EndpointNotice';
