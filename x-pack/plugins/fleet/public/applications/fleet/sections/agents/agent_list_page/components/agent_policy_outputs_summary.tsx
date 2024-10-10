/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import type { CSSProperties } from 'react';
import React, { memo, useMemo } from 'react';

import type { AgentPolicy, Output } from '../../../../types';
import { useLink } from '../../../../hooks';
const MIN_WIDTH: CSSProperties = { minWidth: 0 };
const WRAP_WHITE_SPACE: CSSProperties = { whiteSpace: 'normal' };

export const AgentPolicyOutputsSummary = memo<{
  outputs: Output[];
  agentPolicy: AgentPolicy | undefined;
  monitoring?: boolean;
  direction?: 'column' | 'row';
}>(({ outputs, agentPolicy, monitoring, direction = 'row' }) => {
  const { getHref } = useLink();

  const defaultOutput = outputs.find((item) => item.is_default);
  const policyId = agentPolicy?.id;

  const outputToDisplay = useMemo(() => {
    if (!policyId)
      return {
        name: defaultOutput?.name ?? '',
        id: defaultOutput?.id ?? '',
      };

    if (monitoring) {
      const monitoringOutput = !!agentPolicy?.monitoring_output_id
        ? outputs.find((item) => item.id === agentPolicy.monitoring_output_id)
        : defaultOutput;
      return {
        name: monitoringOutput?.name ?? '',
        id: monitoringOutput?.id ?? '',
      };
    } else {
      const dataOutput = !!agentPolicy?.data_output_id
        ? outputs.find((item) => item.id === agentPolicy.data_output_id)
        : defaultOutput;
      return {
        name: dataOutput?.name ?? '',
        id: dataOutput?.id ?? '',
      };
    }
  }, [agentPolicy, defaultOutput, monitoring, outputs, policyId]);
  const { name, id } = outputToDisplay;
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" wrap={true}>
      <EuiFlexItem>
        <EuiFlexGroup
          direction={direction}
          gutterSize={direction === 'column' ? 'none' : 's'}
          alignItems="baseline"
          style={MIN_WIDTH}
          responsive={false}
          justifyContent={'flexStart'}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup style={MIN_WIDTH} gutterSize="s" alignItems="baseline" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLink
                  style={WRAP_WHITE_SPACE}
                  href={getHref('settings_edit_outputs', { outputId: id })}
                  title={name || id}
                  data-test-subj="outputNameLink"
                >
                  {name}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
