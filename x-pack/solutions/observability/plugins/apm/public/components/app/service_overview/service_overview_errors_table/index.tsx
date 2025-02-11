/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { OverviewTableContainer } from '../../../shared/overview_table_container';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import { ErrorGroupList } from '../../error_group_overview/error_group_list';

interface Props {
  serviceName: string;
  onLoadTable?: () => void;
}

export function ServiceOverviewErrorsTable({ serviceName, onLoadTable }: Props) {
  const { query } = useApmParams('/services/{serviceName}/overview');

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="serviceOverviewErrorsTable">
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.errorsTableTitle', {
                  defaultMessage: 'Errors',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ErrorOverviewLink serviceName={serviceName} query={query}>
              {i18n.translate('xpack.apm.serviceOverview.errorsTableLinkText', {
                defaultMessage: 'View errors',
              })}
            </ErrorOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <OverviewTableContainer fixedHeight={true} isEmptyAndNotInitiated={false}>
          <ErrorGroupList
            serviceName={serviceName}
            onLoadTable={onLoadTable}
            initialPageSize={5}
            isCompactMode={true}
            saveTableOptionsToUrl={false}
            showPerPageOptions={false}
          />
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
