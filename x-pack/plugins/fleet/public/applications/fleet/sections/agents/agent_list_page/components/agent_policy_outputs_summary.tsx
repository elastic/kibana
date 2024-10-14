/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiListGroupItemProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiListGroup,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { CSSProperties } from 'react';
import React, { memo, useMemo, useState } from 'react';

import type { AgentPolicy, Output } from '../../../../types';
import { useLink } from '../../../../hooks';

const WRAP_WHITE_SPACE: CSSProperties = { whiteSpace: 'normal' };

export const AgentPolicyOutputsSummary = memo<{
  outputs: Output[];
  agentPolicy?: AgentPolicy;
  monitoring?: boolean;
}>(({ outputs, agentPolicy, monitoring }) => {
  const { getHref } = useLink();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  const defaultOutput = useMemo(() => {
    return outputs.find((item) => item.is_default);
  }, [outputs]);

  const policyId = agentPolicy?.id;

  const outputToDisplay = useMemo(() => {
    if (!agentPolicy || !policyId) return defaultOutput;

    if (monitoring) {
      return !!agentPolicy?.monitoring_output_id
        ? outputs.find((item) => item.id === agentPolicy.monitoring_output_id)
        : defaultOutput;
    } else {
      return !!agentPolicy?.data_output_id
        ? outputs.find((item) => item.id === agentPolicy.data_output_id)
        : defaultOutput;
    }
  }, [agentPolicy, defaultOutput, monitoring, outputs, policyId]);

  const listItems: EuiListGroupItemProps[] = useMemo(() => {
    if (!outputToDisplay) return [];

    const { hosts } = outputToDisplay;
    return (hosts || []).map((host, index) => {
      return {
        'data-test-subj': `output-host-${index}`,
        label: host,
        href: getHref('settings_edit_outputs', { outputId: outputToDisplay.id }),
        iconType: 'dot',
      };
    });
  }, [getHref, outputToDisplay]);

  if (!outputToDisplay) return null;

  const { name, id, hosts } = outputToDisplay;
  const outputHost = hosts?.[0];

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="baseline"
      responsive={false}
      justifyContent="flexStart"
    >
      <EuiFlexItem grow={false}>
        <EuiLink
          className={`eui-textTruncate`}
          style={WRAP_WHITE_SPACE}
          href={getHref('settings_edit_outputs', { outputId: id })}
          title={outputHost || name}
          data-test-subj="outputNameLink"
        >
          {outputHost || name}
        </EuiLink>
      </EuiFlexItem>

      {hosts && hosts.length > 1 && !monitoring && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            data-test-subj="outputHostsNumberBadge"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            onClickAriaLabel="Open output hosts popover"
          >
            +{hosts.length - 1}
          </EuiBadge>
          <EuiPopover
            data-test-subj="outputHostsPopover"
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="downCenter"
          >
            <EuiPopoverTitle>
              {i18n.translate('xpack.fleet.AgentPolicyOutputsSummary.popover.title', {
                defaultMessage: 'Output for integrations',
              })}
            </EuiPopoverTitle>
            <div style={{ width: '280px' }}>
              <EuiListGroup listItems={listItems} color="primary" size="s" gutterSize="none" />
            </div>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
