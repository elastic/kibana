/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFieldNumber, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ContextualServiceMapControlsProps {
  baseMaxHops: number;
  maxVisibleNodes: number;
  onBaseMaxHopsChange: (value: number) => void;
  onMaxVisibleNodesChange: (value: number) => void;
  onCollapseAll?: () => void;
  hasExpandedNodes?: boolean;
}

export function ContextualServiceMapControls({
  baseMaxHops,
  maxVisibleNodes,
  onBaseMaxHopsChange,
  onMaxVisibleNodesChange,
  onCollapseAll,
  hasExpandedNodes = false,
}: ContextualServiceMapControlsProps) {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj="contextualServiceMapControls"
    >
      <EuiFlexItem grow={false}>
        <EuiFieldNumber
          compressed
          data-test-subj="contextualServiceMapMaxVisible"
          aria-label={i18n.translate('xpack.apm.serviceMap.contextual.maxVisibleAria', {
            defaultMessage: 'Maximum visible nodes',
          })}
          prepend={i18n.translate('xpack.apm.serviceMap.contextual.maxVisible', {
            defaultMessage: 'Max visible',
          })}
          value={maxVisibleNodes}
          min={1}
          max={50}
          onChange={(e) => onMaxVisibleNodesChange(e.target.valueAsNumber || 1)}
          style={{ minWidth: 140 }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFieldNumber
          compressed
          data-test-subj="contextualServiceMapMaxHops"
          aria-label={i18n.translate('xpack.apm.serviceMap.contextual.maxHopsAria', {
            defaultMessage: 'Maximum hops',
          })}
          prepend={i18n.translate('xpack.apm.serviceMap.contextual.maxHops', {
            defaultMessage: 'Hops',
          })}
          value={baseMaxHops}
          min={0}
          max={10}
          onChange={(e) => onBaseMaxHopsChange(e.target.valueAsNumber || 0)}
          style={{ minWidth: 96 }}
        />
      </EuiFlexItem>
      {onCollapseAll && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="minusInCircle"
            onClick={onCollapseAll}
            disabled={!hasExpandedNodes}
            data-test-subj="contextualServiceMapCollapseAll"
          >
            {i18n.translate('xpack.apm.serviceMap.contextual.collapseAll', {
              defaultMessage: 'Collapse all',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
