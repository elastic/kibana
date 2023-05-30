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

import { useDiagnosticsContext } from '../context/use_diagnostics';
import { getIsNonStandardIndexTemplate } from '../index_pattern_settings_tab';
import { getIndexTemplateItems } from '../index_templates_tab';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function IndexTemplatesStatus() {
  const router = useApmRouter();
  const { diagnosticsBundle, status } = useDiagnosticsContext();
  const hasNonStandardIndexTemplates =
    getHasNonStandardIndexTemplates(diagnosticsBundle);
  const isEveryDefaultApmIndexTemplateInstalled =
    getIsEveryDefaultApmIndexTemplateInstalled(diagnosticsBundle);

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
        Index templates
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

function getHasNonStandardIndexTemplates(
  diagnosticsBundle: DiagnosticsBundle | undefined
) {
  return diagnosticsBundle?.indexTemplatesByIndexPattern?.some(
    ({ indexTemplates }) => {
      return indexTemplates?.some(({ templateName }) =>
        getIsNonStandardIndexTemplate(templateName)
      );
    }
  );
}

function getIsEveryDefaultApmIndexTemplateInstalled(
  diagnosticsBundle: DiagnosticsBundle | undefined
) {
  return getIndexTemplateItems(diagnosticsBundle).every(
    ({ matchingIndexTemplate }) => matchingIndexTemplate !== undefined
  );
}
