/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ProfilingHostsCorrelation } from '@kbn/apm-api-shared';

type Props = Partial<ProfilingHostsCorrelation>;

export function FilterWarning({
  scope,
  containerIds = [],
  hostNames = [],
  workloadNames = [],
}: Props) {
  if (!scope) {
    return null;
  }

  switch (scope) {
    case 'container':
      return (
        <FilterWarningToolTip
          values={containerIds}
          label={i18n.translate('xpack.apm.profiling.topFunctions.filteredLabel.containerId', {
            defaultMessage: "Displaying profiling insights from the service's container id(s)",
          })}
        />
      );
    case 'workload':
      return (
        <FilterWarningToolTip
          values={[...workloadNames, ...hostNames]}
          label={i18n.translate('xpack.apm.profiling.topFunctions.filteredLabel.workload', {
            defaultMessage:
              "Displaying profiling insights from the service's Kubernetes workload on its host(s)",
          })}
          description={
            containerIds.length > 0
              ? i18n.translate(
                  'xpack.apm.profiling.topFunctions.filteredLabel.containerIdNotFound',
                  {
                    defaultMessage:
                      'The container id(s) reported by the service were not found in the profiling data: {containerIds}',
                    values: { containerIds: containerIds.join(', ') },
                  }
                )
              : undefined
          }
        />
      );
    case 'workloadAnyHost':
      return (
        <FilterWarningToolTip
          values={workloadNames}
          label={i18n.translate('xpack.apm.profiling.topFunctions.filteredLabel.workloadAnyHost', {
            defaultMessage:
              "Displaying profiling insights from the service's Kubernetes workload (host names did not match)",
          })}
          description={
            hostNames.length > 0
              ? i18n.translate('xpack.apm.profiling.topFunctions.filteredLabel.hostNameNotFound', {
                  defaultMessage:
                    'The host name(s) reported by the service were not found in the profiling data: {hostNames}',
                  values: { hostNames: hostNames.join(', ') },
                })
              : undefined
          }
        />
      );
    case 'host':
      return (
        <FilterWarningToolTip
          values={hostNames}
          label={i18n.translate('xpack.apm.profiling.topFunctions.filteredLabel.hostName', {
            defaultMessage:
              "Displaying profiling insights from every process on the service's host(s)",
          })}
          description={
            containerIds.length > 0
              ? i18n.translate(
                  'xpack.apm.profiling.topFunctions.filteredLabel.containerIdNotFound',
                  {
                    defaultMessage:
                      'The container id(s) reported by the service were not found in the profiling data: {containerIds}',
                    values: { containerIds: containerIds.join(', ') },
                  }
                )
              : undefined
          }
        />
      );
  }
}

interface FilterWarningToolTipProps {
  values: string[];
  label: string;
  description?: string;
}
function FilterWarningToolTip({ values = [], label, description }: FilterWarningToolTipProps) {
  function renderTooltipOptions() {
    return (
      <>
        <ul>
          {values.map((value) => (
            <li key={value}>{`- ${value}`}</li>
          ))}
        </ul>
        {description ? <p>{description}</p> : null}
      </>
    );
  }

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip content={renderTooltipOptions()} type="question" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
