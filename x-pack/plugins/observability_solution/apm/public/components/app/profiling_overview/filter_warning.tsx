/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  hostNames?: string[];
  containerIds?: string[];
}

export function FilterWarning({ containerIds = [], hostNames = [] }: Props) {
  const hasContainerIds = containerIds.length > 0;

  return hasContainerIds ? (
    <FilterWarningToolTip
      values={containerIds}
      label={i18n.translate('xpack.apm.profiling.topFunctions.filteredLabel.containerId', {
        defaultMessage: "Displaying profiling insights from the service's container id(s)",
      })}
    />
  ) : (
    <FilterWarningToolTip
      values={hostNames}
      label={i18n.translate('xpack.apm.profiling.topFunctions.filteredLabel.hostName', {
        defaultMessage: "Displaying profiling insights from the service's host(s)",
      })}
    />
  );
}

interface FilterWarningToolTipProps {
  values: string[];
  label: string;
}
function FilterWarningToolTip({ values = [], label }: FilterWarningToolTipProps) {
  function renderTooltipOptions() {
    return (
      <ul>
        {values.map((value) => (
          <li key={value}>{`- ${value}`}</li>
        ))}
      </ul>
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
        <EuiToolTip content={renderTooltipOptions()}>
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
