/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiLoadingElastic } from '@elastic/eui';
import {
  EuiBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useDiagnosticsContext } from './context/use_diagnostics';
import { getApmIndexTemplatePrefixes } from './helpers';

export function DiagnosticsIndexPatternSettings() {
  const router = useApmRouter();
  const { diagnosticsBundle, status } = useDiagnosticsContext();

  if (status === FETCH_STATUS.LOADING) {
    return <EuiLoadingElastic size="m" />;
  }

  const indexTemplatesByIndexPattern =
    diagnosticsBundle?.indexTemplatesByIndexPattern;

  if (
    !indexTemplatesByIndexPattern ||
    indexTemplatesByIndexPattern?.length === 0
  ) {
    return null;
  }

  const elms = indexTemplatesByIndexPattern.map(
    ({ indexPattern, indexTemplates }) => {
      return (
        <div key={indexPattern}>
          <EuiTitle size="xs">
            <h4>{indexPattern}</h4>
          </EuiTitle>

          {!indexTemplates?.length && <em>No matching index templates</em>}

          {indexTemplates?.map(
            ({ templateName, templateIndexPatterns, priority }) => {
              const isNonStandard = getIsNonStandardIndexTemplate(templateName);

              return (
                <EuiToolTip
                  key={templateName}
                  content={`${templateIndexPatterns.join(
                    ', '
                  )} (Priority: ${priority})`}
                >
                  <EuiBadge
                    color={isNonStandard ? 'warning' : 'hollow'}
                    css={{ marginRight: '5px', marginTop: '5px' }}
                  >
                    {templateName}
                  </EuiBadge>
                </EuiToolTip>
              );
            }
          )}

          <EuiSpacer />
        </div>
      );
    }
  );

  return (
    <>
      <EuiText>
        This section lists the index patterns specified in{' '}
        <EuiLink
          data-test-subj="apmMatchingIndexTemplatesSeeDetailsLink"
          href={router.link('/settings/apm-indices')}
        >
          APM Index Settings
        </EuiLink>{' '}
        and which index templates they match. The priority and index pattern of
        each index template can be seen by hovering over the item.
      </EuiText>
      <EuiSpacer />
      {elms}
    </>
  );
}

export function getIsNonStandardIndexTemplate(templateName: string) {
  const apmIndexTemplatePrefixes = getApmIndexTemplatePrefixes();
  const stackIndexTemplatePrefixes = ['logs', 'metrics'];
  const isNonStandard = [
    ...apmIndexTemplatePrefixes,
    ...stackIndexTemplatePrefixes,
  ].every((prefix) => {
    const notMatch = !templateName.startsWith(prefix);
    return notMatch;
  });

  return isNonStandard;
}
