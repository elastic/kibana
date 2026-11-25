/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { EuiButtonIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ServiceGroupBoxNodeData } from '../../../../common/service_map';
import { GROUP_BOX_HEADER_HEIGHT } from '../../../../common/service_map/constants';
import { useServiceMapInteractivity } from './service_map_interactivity_context';
import { useServiceMapCloseGroup } from './service_map_group_actions_context';
import { useServiceMapSearchHighlight } from './service_map_search_context';

type ServiceGroupBoxNodeType = Node<ServiceGroupBoxNodeData, 'serviceGroupBox'>;

/**
 * Box drawn around the member services of an open group. It only frames its members and closes the
 * group; the members are separate nodes placed inside it.
 */
export const ServiceGroupBoxNode = memo(({ data }: NodeProps<ServiceGroupBoxNodeType>) => {
  const { euiTheme } = useEuiTheme();
  const isInteractive = useServiceMapInteractivity();
  const closeGroup = useServiceMapCloseGroup();
  const { id, label, memberCount } = data;
  const { isActiveSearchMatch } = useServiceMapSearchHighlight(id);

  const handleClose = useCallback(() => closeGroup?.(id), [closeGroup, id]);

  const memberCountLabel = i18n.translate(
    'xpack.apm.serviceMap.serviceGroupBoxNode.memberCountLabel',
    {
      defaultMessage: '{count} {count, plural, one {service} other {services}}',
      values: { count: memberCount },
    }
  );
  const ariaLabel = i18n.translate('xpack.apm.serviceMap.serviceGroupBoxNode.ariaLabel', {
    defaultMessage:
      'Open service group: {groupName}, {count} {count, plural, one {service} other {services}}. Press Enter or Escape to close the group.',
    values: { groupName: label, count: memberCount },
  });
  const closeLabel = i18n.translate('xpack.apm.serviceMap.serviceGroupBoxNode.closeButtonLabel', {
    defaultMessage: 'Close group {groupName}',
    values: { groupName: label },
  });

  const boxStyles = css`
    width: 100%;
    height: 100%;
    border: ${euiTheme.border.width.thin} dashed ${euiTheme.colors.mediumShade};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    pointer-events: all;
    ${isActiveSearchMatch
      ? `
      outline: ${euiTheme.border.width.thick} dashed ${euiTheme.colors.textSubdued};
      outline-offset: -${euiTheme.border.width.thick};
    `
      : ''}
  `;

  const headerStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
    height: ${GROUP_BOX_HEADER_HEIGHT}px;
    padding: 0 ${euiTheme.size.s} 0 ${euiTheme.size.base};
  `;

  const titleStyles = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      css={boxStyles}
      data-test-subj={`serviceMapNode-serviceGroupBox-${id}`}
      data-search-active-match={isActiveSearchMatch || undefined}
    >
      <div css={headerStyles}>
        <EuiText size="s" css={titleStyles} data-test-subj="serviceMapNodeServiceGroupBoxLabel">
          {label}{' '}
          <EuiText
            component="span"
            size="xs"
            color="subdued"
            data-test-subj="serviceMapNodeServiceGroupBoxCount"
          >
            {memberCountLabel}
          </EuiText>
        </EuiText>
        {isInteractive && closeGroup && (
          <EuiToolTip content={closeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              // `nodrag` keeps a press on the button from starting a drag of the whole box
              className="nodrag"
              iconType="minimize"
              color="text"
              size="s"
              aria-label={closeLabel}
              onClick={handleClose}
              data-test-subj="serviceMapNodeServiceGroupBoxClose"
            />
          </EuiToolTip>
        )}
      </div>
    </div>
  );
});

ServiceGroupBoxNode.displayName = 'ServiceGroupBoxNode';
