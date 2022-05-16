/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect, useState } from 'react';
import { EuiEmptyPrompt, EuiLoadingContent, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { HostPolicyResponse } from '../../../../common/endpoint/types';
import { PreferenceFormattedDateFromPrimitive } from '../../../common/components/formatted_date';
import { useHttp } from '../../../common/lib/kibana';
import { useGetEndpointPolicyResponse } from '../../hooks/endpoint/use_get_endpoint_policy_response';
import { getFailedOrWarningActionCountFromPolicyResponse } from '../../pages/endpoint_hosts/store/selectors';
import { PolicyResponse } from './policy_response';

export const PolicyResponseWrapper = memo<{
  endpointId: string;
}>(({ endpointId }) => {
  const http = useHttp();
  const { data, isLoading, isFetching, isError } = useGetEndpointPolicyResponse(http, endpointId);

  const [responseConfig, setResponseConfig] =
    useState<HostPolicyResponse['Endpoint']['policy']['applied']['response']['configurations']>();
  const [responseActions, setResponseActions] =
    useState<HostPolicyResponse['Endpoint']['policy']['applied']['actions']>();
  const [responseAttentionCount, setResponseAttentionCount] = useState<Map<string, number>>(
    new Map<string, number>()
  );

  useEffect(() => {
    if (!!data && !isLoading && !isFetching && !isError) {
      setResponseConfig(data.policy_response.Endpoint.policy.applied.response.configurations);
      setResponseActions(data.policy_response.Endpoint.policy.applied.actions);
      setResponseAttentionCount(
        getFailedOrWarningActionCountFromPolicyResponse(
          data.policy_response.Endpoint.policy.applied
        )
      );
    }
  }, [data, isLoading, isFetching, isError]);

  return (
    <>
      <EuiText data-test-subj="endpointDetailsPolicyResponseFlyoutTitle">
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
      {isLoading && <EuiLoadingContent lines={3} />}
      {responseConfig !== undefined && responseActions !== undefined && (
        <PolicyResponse
          responseConfig={responseConfig}
          responseActions={responseActions}
          responseAttentionCount={responseAttentionCount}
        />
      )}
    </>
  );
});

PolicyResponseWrapper.displayName = 'PolicyResponse';
