/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect, useMemo, useState, useCallback } from 'react';
import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { HostPolicyResponse } from '../../../../common/endpoint/types';
import { PreferenceFormattedDateFromPrimitive } from '../../../common/components/formatted_date';
import { useGetEndpointPolicyResponse } from '../../hooks/endpoint/use_get_endpoint_policy_response';
import { PolicyResponse } from './policy_response';
import { getFailedOrWarningActionCountFromPolicyResponse } from '../../pages/endpoint_hosts/store/utils';
import { PolicyResponseActionFormatter } from './policy_response_friendly_names';
import { PolicyResponseErrorCallout } from './policy_response_error_callout';

export const PolicyResponseWrapper = memo<{
  endpointId: string;
}>(({ endpointId }) => {
  const { data, isLoading, isFetching, isError } = useGetEndpointPolicyResponse(endpointId);

  const [policyResponseConfig, setPolicyResponseConfig] =
    useState<HostPolicyResponse['Endpoint']['policy']['applied']['response']['configurations']>();
  const [policyResponseActions, setPolicyResponseActions] =
    useState<HostPolicyResponse['Endpoint']['policy']['applied']['actions']>();
  const [policyResponseAttentionCount, setPolicyResponseAttentionCount] = useState<
    Map<string, number>
  >(new Map<string, number>());
  const [policyResponseErrors, setPolicyResponseErrors] = useState<PolicyResponseActionFormatter[]>(
    []
  );

  useEffect(() => {
    if (!!data && !isLoading && !isFetching && !isError) {
      setPolicyResponseErrors([]);
      setPolicyResponseConfig(data.policy_response.Endpoint.policy.applied.response.configurations);
      setPolicyResponseActions(data.policy_response.Endpoint.policy.applied.actions);
      setPolicyResponseAttentionCount(
        getFailedOrWarningActionCountFromPolicyResponse(
          data.policy_response.Endpoint.policy.applied
        )
      );
    }
  }, [data, isLoading, isFetching, isError]);

  const addPolicyResponseError = useCallback(
    (policyResponseError: PolicyResponseActionFormatter) => {
      setPolicyResponseErrors((state) => [...state, policyResponseError]);
    },
    []
  );

  const generateId = useMemo(() => htmlIdGenerator(), []);

  const policyResponseErrorMessages = useMemo(() => {
    if (!policyResponseErrors.length) {
      return;
    }

    return (
      <>
        {policyResponseErrors.map((policyResponseError, index) => (
          <React.Fragment key={generateId(`key_${policyResponseError.name}_${index}`)}>
            <EuiSpacer size="m" />
            <PolicyResponseErrorCallout policyResponseError={policyResponseError} />
          </React.Fragment>
        ))}
      </>
    );
  }, [policyResponseErrors, generateId]);

  return (
    <>
      <EuiText data-test-subj="endpointDetailsPolicyResponseTitle">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyResponse.title"
            defaultMessage="Policy Response"
          />
        </h4>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued" data-test-subj="endpointDetailsPolicyResponseTimestamp">
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
          addPolicyResponseError={addPolicyResponseError}
        />
      )}
      {policyResponseErrorMessages}
    </>
  );
});

PolicyResponseWrapper.displayName = 'PolicyResponse';
