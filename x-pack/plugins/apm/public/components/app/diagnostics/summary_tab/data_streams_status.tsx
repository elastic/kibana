/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { getIsValidIndexTemplateName } from '../../../../../common/diagnostics/get_default_index_template_names';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

export function DataStreamsStatus() {
  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/data_streams`);
  }, []);

  const router = useApmRouter();
  const isLoading = status === FETCH_STATUS.LOADING;
  const isEveryTemplateNameValid = (data?.dataStreams ?? []).every((ds) =>
    getIsValidIndexTemplateName(ds.template)
  );

  const hasNonDataStreamIndices = data?.nonDataStreamIndices.length;
  const isOk = !hasNonDataStreamIndices && isEveryTemplateNameValid;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {isLoading ? (
              <EuiBadge color="default">-</EuiBadge>
            ) : isOk ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="warning">Warning</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={10}>
        {isLoading
          ? '...'
          : isOk
          ? 'Data streams: No problems found'
          : hasNonDataStreamIndices
          ? 'Data streams: Non-data stream indices were found'
          : 'Data streams: Some data streams are backed by non-standard index templates'}
        <EuiLink
          data-test-subj="apmDataStreamsStatusSeeDetailsLink"
          href={router.link('/diagnostics/data_streams')}
        >
          See details
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
