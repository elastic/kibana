/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { EuiHealth, EuiToolTip, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  POLICY_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_TEXT,
} from '../../pages/endpoint_hosts/view/host_constants';
import type { HostMetadata } from '../../../../common/endpoint/types';

/**
 * Displays the status of an applied policy on the Endpoint (using the information provided
 * by the endpoint in the Metadata document `Endpoint.policy.applied`.
 * By default, the policy status is displayed as plain text, however, that can be overridden
 * by defining the `children` prop or passing a child component to this one.
 */
export type EndpointAppliedPolicyStatusProps = PropsWithChildren<{
  policyApplied: HostMetadata['Endpoint']['policy']['applied'];
}>;

/**
 * Display the status of the Policy applied on an endpoint
 */
export const EndpointAppliedPolicyStatus = memo<EndpointAppliedPolicyStatusProps>(
  ({ policyApplied, children }) => {
    return (
      <EuiToolTip
        title={
          <FormattedMessage
            id="xpack.securitySolution.endpointPolicyStatus.tooltipTitleLabel"
            defaultMessage="Policy applied"
          />
        }
        anchorClassName="eui-textTruncate"
        content={
          <EuiFlexGroup
            responsive={false}
            gutterSize="s"
            alignItems="center"
            data-test-subj="endpointAppliedPolicyTooltipInfo"
          >
            <EuiFlexItem className="eui-textTruncate" grow>
              <EuiText size="s" className="eui-textTruncate">
                {policyApplied.name}
              </EuiText>
            </EuiFlexItem>

            {policyApplied.endpoint_policy_version && (
              <EuiFlexItem grow={false}>
                <EuiText
                  color="subdued"
                  size="xs"
                  style={{ whiteSpace: 'nowrap', paddingLeft: '6px' }}
                  className="eui-textTruncate"
                  data-test-subj="policyRevision"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpointPolicyStatus.revisionNumber"
                    defaultMessage="rev. {revNumber}"
                    values={{ revNumber: policyApplied.endpoint_policy_version }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
      >
        <EuiHealth
          color={POLICY_STATUS_TO_HEALTH_COLOR[policyApplied.status]}
          className="eui-textTruncate eui-fullWidth"
          data-test-subj="policyStatus"
        >
          {children !== undefined ? children : POLICY_STATUS_TO_TEXT[policyApplied.status]}
        </EuiHealth>
      </EuiToolTip>
    );
  }
);
EndpointAppliedPolicyStatus.displayName = 'EndpointAppliedPolicyStatus';
