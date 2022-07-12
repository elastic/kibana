/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ApmMainTemplate } from './apm_main_template';
import { SpanIcon } from '../../shared/span_icon';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { SearchBar } from '../../shared/search_bar';
import {
  getKueryBarBoolFilter,
  kueryBarPlaceholder,
} from '../../../../common/backends';
import { useOperationBreakdownEnabledSetting } from '../../../hooks/use_operations_breakdown_enabled_setting';

interface Props {
  children: React.ReactNode;
}

export function BackendDetailTemplate({ children }: Props) {
  const {
    query,
    query: { backendName, rangeFrom, rangeTo, environment },
  } = useApmParams('/backends');

  const router = useApmRouter();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const path = useApmRoutePath();

  const isOperationsBreakdownFeatureEnabled =
    useOperationBreakdownEnabledSetting();

  const kueryBarBoolFilter = getKueryBarBoolFilter({
    environment,
    backendName,
  });

  const backendMetadataFetch = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi('GET /internal/apm/dependencies/metadata', {
        params: {
          query: {
            backendName,
            start,
            end,
          },
        },
      });
    },
    [backendName, start, end]
  );

  const { data: { metadata } = {} } = backendMetadataFetch;

  const tabs = isOperationsBreakdownFeatureEnabled
    ? [
        {
          key: 'overview',
          href: router.link('/backends/overview', {
            query,
          }),
          label: i18n.translate('xpack.apm.backendDetailOverview.title', {
            defaultMessage: 'Overview',
          }),
          isSelected: path === '/backends/overview',
        },
        {
          key: 'operations',
          href: router.link('/backends/operations', {
            query,
          }),
          label: i18n.translate('xpack.apm.backendDetailOperations.title', {
            defaultMessage: 'Operations',
          }),
          isSelected:
            path === '/backends/operations' || path === '/backends/operation',
        },
      ]
    : [];

  return (
    <ApmMainTemplate
      pageHeader={{
        tabs,
        pageTitle: (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{backendName}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SpanIcon
                type={metadata?.spanType}
                subtype={metadata?.spanSubtype}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    >
      <SearchBar
        showTimeComparison
        kueryBarPlaceholder={kueryBarPlaceholder}
        kueryBarBoolFilter={kueryBarBoolFilter}
      />
      {children}
    </ApmMainTemplate>
  );
}
