/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useFetcher } from '../../../../hooks/use_fetcher';

export function FieldMappingStatus() {
  const router = useApmRouter();
  const { data } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/diagnostics/invalid_field_mappings');
  }, []);

  const invalidCount = data?.invalidFieldMappings.length;
  const isOk = invalidCount === 0;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {isOk ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="danger">Error</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        {isOk
          ? 'Field mappings: Looking good!'
          : i18n.translate('xpack.apm.diagnostics.invalid_mapping.title', {
              defaultMessage:
                '{invalidCount} {invalidCount, plural, one {field is} other {fields are}} mapped incorrectly',
              values: {
                invalidCount,
              },
            })}

        <EuiLink
          data-test-subj="apmFieldMappingStatusSeeDetailsLink"
          href={router.link('/diagnostics/invalid-field-mappings')}
        >
          See details
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
