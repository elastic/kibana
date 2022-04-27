/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { EuiHealth, EuiToolTip, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  POLICY_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_TEXT,
} from '../../pages/endpoint_hosts/view/host_constants';
import { HostMetadata } from '../../../../common/endpoint/types';

/**
 * Displays the status of an applied policy on the Endpoint (using the information provided
 * by the endpoint in the Metadata document `Endpoint.policy.applied`.
 * By default, the policy status is displayed as plain text, however, that can be overriden
 * by defining the `children` prop or passing a child component to this one.
 */
type EndpointPolicyStatusProps = PropsWithChildren<{
  policyApplied: HostMetadata['Endpoint']['policy']['applied'];
}>;

/**
 * Display the status of the Policy applied on an endpoint
 */
export const EndpointPolicyStatus = memo<EndpointPolicyStatusProps>(
  ({ policyApplied, children }) => {
    return (
      <EuiToolTip
        content={
          <EuiText>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.securitySolution.endpointPolicyStatus.tooltipPolicyNameLabel"
                defaultMessage="Policy"
              />
            </EuiText>
            <div>{policyApplied.name}</div>

            <EuiText size="s">
              <FormattedMessage
                id="xpack.securitySolution.endpointPolicyStatus.tooltipPolicyRevisionLabel"
                defaultMessage="Revision"
              />
            </EuiText>
            <div>{policyApplied.endpoint_policy_version}</div>
          </EuiText>
        }
        anchorClassName="eui-textTruncate"
      >
        <EuiHealth
          color={POLICY_STATUS_TO_HEALTH_COLOR[policyApplied.status]}
          className="eui-textTruncate eui-fullWidth"
          data-test-subj="rowPolicyStatus"
        >
          {children !== undefined ? children : POLICY_STATUS_TO_TEXT[policyApplied.status]}
        </EuiHealth>
      </EuiToolTip>
    );
  }
);
EndpointPolicyStatus.displayName = 'EndpointPolicyStatus';
