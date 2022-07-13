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
} from '../../../../common/dependencies';
import { useOperationBreakdownEnabledSetting } from '../../../hooks/use_operations_breakdown_enabled_setting';

interface Props {
  children: React.ReactNode;
}

export function DependencyDetailTemplate({ children }: Props) {
  const {
    query,
    query: { dependencyName, rangeFrom, rangeTo, environment },
  } = useApmParams('/dependencies');

  const router = useApmRouter();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const path = useApmRoutePath();

  const isOperationsBreakdownFeatureEnabled =
    useOperationBreakdownEnabledSetting();

  const kueryBarBoolFilter = getKueryBarBoolFilter({
    environment,
    dependencyName,
  });

  const dependencyMetadataFetch = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi('GET /internal/apm/dependencies/metadata', {
        params: {
          query: {
            dependencyName,
            start,
            end,
          },
        },
      });
    },
    [dependencyName, start, end]
  );

  const { data: { metadata } = {} } = dependencyMetadataFetch;

  const tabs = isOperationsBreakdownFeatureEnabled
    ? [
        {
          key: 'overview',
          href: router.link('/dependencies/overview', {
            query,
          }),
          label: i18n.translate('xpack.apm.DependencyDetailOverview.title', {
            defaultMessage: 'Overview',
          }),
          isSelected: path === '/dependencies/overview',
        },
        {
          key: 'operations',
          href: router.link('/dependencies/operations', {
            query,
          }),
          label: i18n.translate('xpack.apm.DependencyDetailOperations.title', {
            defaultMessage: 'Operations',
          }),
          isSelected:
            path === '/dependencies/operations' ||
            path === '/dependencies/operation',
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
                <h1>{dependencyName}</h1>
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
