/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect, useState } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { HostPolicyResponse } from '../../../../common/endpoint/types';
import { PreferenceFormattedDateFromPrimitive } from '../../../common/components/formatted_date';
import { useGetEndpointPolicyResponse } from '../../hooks/endpoint/use_get_endpoint_policy_response';
import { PolicyResponse } from './policy_response';
import { getFailedOrWarningActionCountFromPolicyResponse } from '../../pages/endpoint_hosts/store/utils';

export interface PolicyResponseWrapperProps {
  endpointId: string;
  showRevisionMessage?: boolean;
  onShowNeedsAttentionButton?: (val: boolean) => void;
}

export const PolicyResponseWrapper = memo<PolicyResponseWrapperProps>(
  ({ endpointId, showRevisionMessage = true, onShowNeedsAttentionButton }) => {
    const { data, isLoading, isFetching, isError } = useGetEndpointPolicyResponse(endpointId);

    const [policyResponseConfig, setPolicyResponseConfig] =
      useState<HostPolicyResponse['Endpoint']['policy']['applied']['response']['configurations']>();
    const [policyResponseActions, setPolicyResponseActions] =
      useState<HostPolicyResponse['Endpoint']['policy']['applied']['actions']>();
    const [policyResponseAttentionCount, setPolicyResponseAttentionCount] = useState<
      Map<string, number>
    >(new Map<string, number>());

    useEffect(() => {
      if (!!data && !isLoading && !isFetching && !isError) {
        setPolicyResponseConfig(
          data.policy_response.Endpoint.policy.applied.response.configurations
        );
        setPolicyResponseActions(data.policy_response.Endpoint.policy.applied.actions);
        setPolicyResponseAttentionCount(
          getFailedOrWarningActionCountFromPolicyResponse(
            data.policy_response.Endpoint.policy.applied
          )
        );
      }
    }, [data, isLoading, isFetching, isError]);

    // This is needed for the `needs attention` action button in fleet. Will callback `true` if any error in policy response
    useEffect(() => {
      if (onShowNeedsAttentionButton) {
        for (const count of policyResponseAttentionCount.values()) {
          if (count) {
            // When an error has found, callback to true and return for loop exit
            onShowNeedsAttentionButton(true);
            return;
          }
        }
      }
    }, [policyResponseAttentionCount, onShowNeedsAttentionButton]);

    return (
      <>
        {showRevisionMessage && (
          <>
            <EuiText size="xs" color="subdued" data-test-subj="endpointPolicyResponseTimestamp">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyResponse.appliedOn"
                defaultMessage="Revision {rev} applied on {date}"
                values={{
                  rev: data?.policy_response.Endpoint.policy.applied.endpoint_policy_version ?? '',
                  date: (
                    <PreferenceFormattedDateFromPrimitive
                      value={data?.policy_response['@timestamp'] ?? ''}
                    />
                  ),
                }}
              />
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        {isError && (
          <EuiEmptyPrompt
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.noPolicyResponse"
                defaultMessage="No policy response available"
              />
            }
          />
        )}
        {isLoading && <EuiLoadingSpinner size="m" />}
        {policyResponseConfig !== undefined && policyResponseActions !== undefined && (
          <PolicyResponse
            policyResponseConfig={policyResponseConfig}
            policyResponseActions={policyResponseActions}
            policyResponseAttentionCount={policyResponseAttentionCount}
          />
        )}
      </>
    );
  }
);

PolicyResponseWrapper.displayName = 'PolicyResponse';
