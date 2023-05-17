/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useFetcher } from '../../../../hooks/use_fetcher';

type APIResponseType =
  APIReturnType<'GET /internal/apm/diagnostics/index_templates'>;

export function IndexTemplatesStatus() {
  const router = useApmRouter();
  const { data } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/index_templates`);
  }, []);

  const hasNonStandardIndexTemplates = getHasNonStandardIndexTemplates(data);
  const isEveryDefaultApmIndexTemplateInstalled =
    getIsEveryDefaultApmIndexTemplateInstalled(data);

  const isOk =
    isEveryDefaultApmIndexTemplateInstalled && !hasNonStandardIndexTemplates;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {isOk ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="warning">Warning</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        {isOk
          ? 'Index templates: No problems found'
          : isEveryDefaultApmIndexTemplateInstalled === false
          ? 'Index templates: Not all expected index templates exist'
          : 'Index templates: Non standard index templates found'}

        <EuiLink
          data-test-subj="apmIndexTemplatesStatusSeeDetailsLink"
          href={router.link('/diagnostics/index-templates')}
        >
          See details
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function getHasNonStandardIndexTemplates(data: APIResponseType | undefined) {
  return data?.matchingIndexTemplates?.some(({ indexTemplates }) => {
    return indexTemplates?.some(({ isNonStandard }) => isNonStandard);
  });
}

function getIsEveryDefaultApmIndexTemplateInstalled(
  data: APIResponseType | undefined
) {
  return Object.values(data?.defaultApmIndexTemplateStates ?? {}).every(
    (state) => state.exists
  );
}
