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
import { getIndexTemplatesByIndexPattern } from '../index_templates_tab';

type APIResponseType =
  APIReturnType<'GET /internal/apm/diagnostics/index_templates'>;

export function IndexTemplatesStatus() {
  const router = useApmRouter();
  const { data } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/index_templates`);
  }, []);

  const hasNonStandardIndexTemplates = getHasNonStandardIndexTemplates(data);
  const isEveryExpectedIndexTemplateInstalled =
    getIsEveryExpectedIndexTemplateInstalled(data);

  const isOk =
    isEveryExpectedIndexTemplateInstalled && !hasNonStandardIndexTemplates;

  const indexTemplatesLink = (
    <EuiLink
      data-test-subj="apmExpectedIndexTemplatesInstalledStatusAsLink"
      href={router.link('/diagnostics/index-templates')}
    >
      See details
    </EuiLink>
  );

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
        {isOk ? (
          'Default index templates were found'
        ) : isEveryExpectedIndexTemplateInstalled === false ? (
          <>Some index templates could not be found {indexTemplatesLink}</>
        ) : (
          <>Non standard index templates were found {indexTemplatesLink}</>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function getHasNonStandardIndexTemplates(data: APIResponseType | undefined) {
  return getIndexTemplatesByIndexPattern(data)?.some(({ indexTemplates }) => {
    return indexTemplates?.some(({ isNonStandard }) => isNonStandard);
  });
}

function getIsEveryExpectedIndexTemplateInstalled(
  data: APIResponseType | undefined
) {
  return Object.values(data?.expectedIndexTemplateStates ?? {}).every(
    (state) => state.exists
  );
}
