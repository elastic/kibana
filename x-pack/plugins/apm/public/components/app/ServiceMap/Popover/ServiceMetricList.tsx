/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner
} from '@elastic/eui';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { isNumber } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { ServiceNodeMetrics } from '../../../../../common/service_map';
import { asDuration, asPercent, tpmUnit } from '../../../../utils/formatters';

function LoadingSpinner() {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceAround"
      style={{ height: 170 }}
    >
      <EuiLoadingSpinner size="xl" />
    </EuiFlexGroup>
  );
}

const BadgeRow = styled(EuiFlexItem)`
  padding-bottom: ${lightTheme.gutterTypes.gutterSmall};
`;

const ItemRow = styled('tr')`
  line-height: 2;
`;

const ItemTitle = styled('td')`
  color: ${lightTheme.textColors.subdued};
  padding-right: 1rem;
`;

const ItemDescription = styled('td')`
  text-align: right;
`;

interface ServiceMetricListProps extends ServiceNodeMetrics {
  frameworkName?: string;
  isLoading: boolean;
}

export function ServiceMetricList({
  avgTransactionDuration,
  avgRequestsPerMinute,
  avgErrorsPerMinute,
  avgCpuUsage,
  avgMemoryUsage,
  frameworkName,
  numInstances,
  isLoading
}: ServiceMetricListProps) {
  const listItems = [
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgTransDurationPopoverMetric',
        {
          defaultMessage: 'Trans. duration (avg.)'
        }
      ),
      description: isNumber(avgTransactionDuration)
        ? asDuration(avgTransactionDuration)
        : null
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgReqPerMinutePopoverMetric',
        {
          defaultMessage: 'Req. per minute (avg.)'
        }
      ),
      description: isNumber(avgRequestsPerMinute)
        ? `${avgRequestsPerMinute.toFixed(2)} ${tpmUnit('request')}`
        : null
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgErrorsPerMinutePopoverMetric',
        {
          defaultMessage: 'Errors per minute (avg.)'
        }
      ),
      description: avgErrorsPerMinute?.toFixed(2)
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.avgCpuUsagePopoverMetric', {
        defaultMessage: 'CPU usage (avg.)'
      }),
      description: isNumber(avgCpuUsage) ? asPercent(avgCpuUsage, 1) : null
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgMemoryUsagePopoverMetric',
        {
          defaultMessage: 'Memory usage (avg.)'
        }
      ),
      description: isNumber(avgMemoryUsage)
        ? asPercent(avgMemoryUsage, 1)
        : null
    }
  ];
  const showBadgeRow = frameworkName || numInstances > 1;

  return isLoading ? (
    <LoadingSpinner />
  ) : (
    <>
      {showBadgeRow && (
        <BadgeRow>
          <EuiFlexGroup gutterSize="none">
            {frameworkName && <EuiBadge>{frameworkName}</EuiBadge>}
            {numInstances > 1 && (
              <EuiBadge iconType="apps" color="hollow">
                {i18n.translate('xpack.apm.serviceMap.numInstancesMetric', {
                  values: { numInstances },
                  defaultMessage: '{numInstances} instances'
                })}
              </EuiBadge>
            )}
          </EuiFlexGroup>
        </BadgeRow>
      )}
      <table>
        <tbody>
          {listItems.map(
            ({ title, description }) =>
              description && (
                <ItemRow key={title}>
                  <ItemTitle>{title}</ItemTitle>
                  <ItemDescription>{description}</ItemDescription>
                </ItemRow>
              )
          )}
        </tbody>
      </table>
    </>
  );
}
