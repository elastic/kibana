/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect, useState, useMemo } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../common/lib/kibana';
import type { HostPolicyResponse } from '../../../../common/endpoint/types';
import { PreferenceFormattedDateFromPrimitive } from '../../../common/components/formatted_date';
import { useGetEndpointPolicyResponse } from '../../hooks/endpoint/use_get_endpoint_policy_response';
import { PolicyResponse } from './policy_response';
import { getFailedOrWarningActionCountFromPolicyResponse } from '../../pages/endpoint_hosts/store/utils';
import { PolicyResponseActionItem } from './policy_response_action_item';
import { PolicyResponseActionFormatter } from './policy_response_friendly_names';
import { useGetEndpointDetails } from '../../hooks';

export interface PolicyResponseWrapperProps {
  endpointId: string;
  showRevisionMessage?: boolean;
  onShowNeedsAttentionBadge?: (val: boolean) => void;
}

export const PolicyResponseWrapper = memo<PolicyResponseWrapperProps>(
  ({ endpointId, showRevisionMessage = true, onShowNeedsAttentionBadge }) => {
    const { data, isLoading, isFetching, isError } = useGetEndpointPolicyResponse(endpointId);
    const { data: endpointDetails } = useGetEndpointDetails(endpointId);

    const { docLinks } = useKibana().services;

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
      if (onShowNeedsAttentionBadge) {
        for (const count of policyResponseAttentionCount.values()) {
          if (count) {
            // When an error has found, callback to true and return for loop exit
            onShowNeedsAttentionBadge(true);
            return;
          }
        }
      }
    }, [policyResponseAttentionCount, onShowNeedsAttentionBadge]);

    const genericErrors = useMemo(() => {
      if (!policyResponseConfig && !policyResponseActions) {
        return [];
      }

      return policyResponseActions?.reduce<PolicyResponseActionFormatter[]>(
        (acc, currentAction) => {
          const policyResponseActionFormatter = new PolicyResponseActionFormatter(
            currentAction,
            docLinks.links.securitySolution.policyResponseTroubleshooting,
            endpointDetails?.metadata.host.os.name.toLowerCase()
          );

          if (policyResponseActionFormatter.isGeneric && policyResponseActionFormatter.hasError) {
            acc.push(policyResponseActionFormatter);
          }

          return acc;
        },
        []
      );
    }, [
      docLinks.links.securitySolution.policyResponseTroubleshooting,
      policyResponseActions,
      policyResponseConfig,
      endpointDetails?.metadata.host.os.name,
    ]);

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
          <>
            <PolicyResponse
              hostOs={endpointDetails?.metadata.host.os.name.toLowerCase() ?? ''}
              policyResponseConfig={policyResponseConfig}
              policyResponseActions={policyResponseActions}
              policyResponseAttentionCount={policyResponseAttentionCount}
            />
            <EuiSpacer size="m" />
            {genericErrors?.map((genericActionError) => (
              <React.Fragment key={genericActionError.key}>
                <PolicyResponseActionItem policyResponseActionFormatter={genericActionError} />
                <EuiSpacer size="m" />
              </React.Fragment>
            ))}
          </>
        )}
      </>
    );
  }
);

PolicyResponseWrapper.displayName = 'PolicyResponse';
