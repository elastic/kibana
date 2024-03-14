/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  hostNames?: string[];
}
export function HostnamesFilterWarning({ hostNames = [] }: Props) {
  function renderTooltipOptions() {
    return (
      <ul>
        {hostNames.map((hostName) => (
          <li key={hostName}>{`- ${hostName}`}</li>
        ))}
      </ul>
    );
  }

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.apm.profiling.flamegraph.filteredLabel', {
            defaultMessage: "Displaying profiling insights from the service's host(s)",
          })}
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
