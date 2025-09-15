/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiLoadingElastic } from '@elastic/eui';
import { EuiBadge, EuiSpacer, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useDiagnosticsContext } from './context/use_diagnostics';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsIndexPatternSettings() {
  const router = useApmRouter();
  const { diagnosticsBundle, status } = useDiagnosticsContext();

  if (status === FETCH_STATUS.LOADING) {
    return <EuiLoadingElastic size="m" />;
  }

  const indexTemplatesByIndexPattern = diagnosticsBundle?.indexTemplatesByIndexPattern;

  if (!indexTemplatesByIndexPattern || indexTemplatesByIndexPattern?.length === 0) {
    return (
      <EuiText>
        {i18n.translate('xpack.apm.diagnosticsIndexPatternSettings.noSettingsToDisplayTextLabel', {
          defaultMessage: 'No settings to display',
        })}
      </EuiText>
    );
  }

  const elms = indexTemplatesByIndexPattern.map(({ indexPattern, indexTemplates }) => {
    return (
      <div key={indexPattern}>
        <EuiTitle size="xs">
          <h4>{indexPattern}</h4>
        </EuiTitle>

        {!indexTemplates?.length && <em>{i18n.translate('xpack.apm.elms.em.noMatchingIndexTemplatesLabel', { defaultMessage: 'No matching index templates' })}</em>}

        {indexTemplates?.map(({ templateName, templateIndexPatterns, priority, isNonStandard }) => {
          const text = priority
            ? `(Priority: ${priority})`
            : isNonStandard
            ? `(legacy template)`
            : '';
          return (
            <EuiToolTip key={templateName} content={`${templateIndexPatterns.join(', ')} ${text}`}>
              <EuiBadge
                color={isNonStandard ? 'warning' : 'hollow'}
                css={{ marginRight: '5px', marginTop: '5px' }}
              >
                {templateName}
              </EuiBadge>
            </EuiToolTip>
          );
        })}

        <EuiSpacer />
      </div>
    );
  });

  return (
    <>
      <EuiText>
        {i18n.translate('xpack.apm.diagnosticsIndexPatternSettings.thisSectionListsTheTextLabel', { defaultMessage: 'This section lists the index patterns specified in' })}{' '}
        <EuiLink
          data-test-subj="apmMatchingIndexTemplatesSeeDetailsLink"
          href={router.link('/settings/apm-indices')}
        >
          {i18n.translate('xpack.apm.diagnosticsIndexPatternSettings.apmIndexSettingsLinkLabel', { defaultMessage: 'APM Index Settings' })}</EuiLink>{' '}
        {i18n.translate('xpack.apm.diagnosticsIndexPatternSettings.andWhichIndexTemplatesTextLabel', { defaultMessage: 'and which index templates they match. The priority and index pattern of each index template
        can be seen by hovering over the item.' })}</EuiText>
      <EuiSpacer />
      {elms}
    </>
  );
}

export function getIsIndexPatternTabOk(diagnosticsBundle?: DiagnosticsBundle) {
  if (!diagnosticsBundle) {
    return true;
  }

  const hasError = diagnosticsBundle.indexTemplatesByIndexPattern.some(({ indexTemplates }) =>
    indexTemplates.some(({ isNonStandard }) => isNonStandard)
  );

  return !hasError;
}
