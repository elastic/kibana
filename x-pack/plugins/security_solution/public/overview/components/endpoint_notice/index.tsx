/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getEndpointListPath } from '../../../management/common/routing';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useManagementFormatUrl } from '../../../management/components/hooks/use_management_format_url';
import { MANAGEMENT_APP_ID } from '../../../management/common/constants';

export const EndpointNotice = memo<{ onDismiss: () => void }>(({ onDismiss }) => {
  const endpointsPath = getEndpointListPath({ name: 'endpointList' });
  const endpointsLink = useManagementFormatUrl(endpointsPath);
  const handleGetStartedClick = useNavigateToAppEventHandler(MANAGEMENT_APP_ID, {
    path: endpointsPath,
  });

  return (
    <EuiCallOut
      data-test-subj="endpoint-prompt-banner"
      iconType="cheer"
      title={
        <>
          <b>
            <FormattedMessage
              id="xpack.securitySolution.overview.endpointNotice.introducing"
              defaultMessage="Introducing: "
            />
          </b>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.title"
            defaultMessage="Endpoint Security (beta)"
          />
        </>
      }
    >
      <>
        <p>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.message"
            defaultMessage="Protect your hosts with threat prevention, detection, and deep security data visibility."
          />
        </p>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click*/}
        <EuiButton onClick={handleGetStartedClick} href={endpointsLink}>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.tryButton"
            defaultMessage="Try Endpoint Security (beta)"
          />
        </EuiButton>
        <EuiButtonEmpty onClick={onDismiss}>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.dismiss"
            defaultMessage="Dismiss message"
          />
        </EuiButtonEmpty>
      </>
    </EuiCallOut>
  );
});
EndpointNotice.displayName = 'EndpointNotice';
