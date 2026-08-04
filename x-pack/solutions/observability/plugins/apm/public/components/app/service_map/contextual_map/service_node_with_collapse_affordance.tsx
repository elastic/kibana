/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ServiceNodeData } from '../../../../../common/service_map';
import { ServiceNode } from '../../../shared/service_map/service_node';
import { useCollapsibleServiceMapContext } from './collapsible_service_map_context';

type ServiceNodeType = Node<ServiceNodeData, 'service'>;

const diamondBadgeStyles = css`
  transform: rotate(45deg);
  min-width: 22px;
  justify-content: center;

  .euiBadge__content {
    transform: rotate(-45deg);
    padding: 0 4px;
    font-size: 11px;
    font-weight: 700;
  }
`;

export const ServiceNodeWithCollapseAffordance = memo((props: NodeProps<ServiceNodeType>) => {
  const { euiTheme } = useEuiTheme();
  const ctx = useCollapsibleServiceMapContext();
  const nodeId = props.id;

  const affordanceColumnStyles = useMemo(
    () => css`
      position: absolute;
      top: 50%;
      left: 100%;
      transform: translate(6px, -50%);
      pointer-events: auto;
      z-index: ${Number(euiTheme.levels.content) + 1};
    `,
    [euiTheme.levels.content]
  );
  const hiddenDependencyCount = ctx.getHiddenDependencyCount(nodeId);
  const hiddenAttentionCount = ctx.getHiddenAttentionCount(nodeId);
  const isExpanded = ctx.expandedNodeIds.has(nodeId);
  const canExpand = hiddenDependencyCount > 0;

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <ServiceNode {...props} />
      {(canExpand || isExpanded) && (
        <div css={affordanceColumnStyles}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {canExpand && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.apm.serviceMap.contextual.expandHidden', {
                    defaultMessage:
                      'Show {count, plural, one {# hidden dependency} other {# hidden dependencies}}{attentionCount, plural, =0 {} one { (# needs attention)} other { (# need attention)}}',
                    values: {
                      count: hiddenDependencyCount,
                      attentionCount: hiddenAttentionCount,
                    },
                  })}
                >
                  <EuiButtonIcon
                    data-test-subj="serviceMapExpandHiddenButton"
                    iconType="plusInCircle"
                    aria-label={i18n.translate('xpack.apm.serviceMap.contextual.expandHiddenAria', {
                      defaultMessage: 'Expand hidden dependencies',
                    })}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      ctx.onExpand(nodeId);
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {canExpand && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={hiddenAttentionCount > 0 ? 'danger' : 'hollow'}
                  css={diamondBadgeStyles}
                >
                  {hiddenDependencyCount}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {isExpanded && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.apm.serviceMap.contextual.collapseExpanded', {
                    defaultMessage: 'Collapse dependencies revealed from this service',
                  })}
                >
                  <EuiButtonIcon
                    data-test-subj="serviceMapCollapseExpandedButton"
                    iconType="minusInCircle"
                    aria-label={i18n.translate(
                      'xpack.apm.serviceMap.contextual.collapseExpandedAria',
                      {
                        defaultMessage: 'Collapse expanded dependencies',
                      }
                    )}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      ctx.onCollapse(nodeId);
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      )}
    </div>
  );
});

ServiceNodeWithCollapseAffordance.displayName = 'ServiceNodeWithCollapseAffordance';
