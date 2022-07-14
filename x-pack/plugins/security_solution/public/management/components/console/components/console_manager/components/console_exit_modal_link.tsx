/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiLink } from '@elastic/eui';
import { useAppUrl } from '../../../../../../common/lib/kibana/hooks';
import { getEndpointDetailsPath } from '../../../../../common/routing';
import { useEndpointSelector } from '../../../../../pages/endpoint_hosts/view/hooks';
import { CONSOLE_EXIT_MODAL_INFO } from '../translations';
import { useNavigateByRouterEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { uiQueryParams } from '../../../../../pages/endpoint_hosts/store/selectors';

export const HostNameText = ({ hostName }: { hostName: string }) => (
  <EuiText size="s" style={{ maxWidth: 120, display: 'inline-flex' }}>
    <span className="eui-textTruncate">
      <strong>{hostName}</strong>
    </span>
  </EuiText>
);

export const ConsoleExitModalActionLogLink = memo(
  ({ agentId, hostName, onClose }: { agentId: string; hostName: string; onClose: () => void }) => {
    const { getAppUrl } = useAppUrl();
    const { show: _, ...currentUrlQueryParams } = useEndpointSelector(uiQueryParams);

    const detailsRoutePath = useMemo(
      () =>
        getEndpointDetailsPath({
          name: 'endpointActivityLog',
          ...currentUrlQueryParams,
          selected_endpoint: agentId,
        }),
      [agentId, currentUrlQueryParams]
    );
    const getActivityLogRoute = useNavigateByRouterEventHandler(detailsRoutePath);

    const onClickActionLogLink = useCallback(
      (e) => {
        onClose();
        getActivityLogRoute(e);
      },
      [getActivityLogRoute, onClose]
    );

    return (
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.consolePageOverlay.exitModal.actionLogLink"
          defaultMessage="Pending response actions will resume. You may track the actions progress on {hostName}'s {link}."
          values={{
            hostName: <HostNameText hostName={hostName} />,
            link: (
              // eslint-disable-next-line @elastic/eui/href-or-on-click
              <EuiLink onClick={onClickActionLogLink} href={getAppUrl({ path: detailsRoutePath })}>
                {CONSOLE_EXIT_MODAL_INFO.actionLogLink}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    );
  }
);

ConsoleExitModalActionLogLink.displayName = 'ConsoleExitModalActionLogLink';
