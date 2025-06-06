/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asDuration } from '../../../../common/utils/formatters';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TruncateWithTooltip } from '../truncate_with_tooltip';

export function BarDetails({
  item,
  left,
  onErrorClick,
}: {
  item: TraceItem;
  left: number;
  onErrorClick?: (params: { traceId: string; docId: string }) => void;
}) {
  const theme = useEuiTheme();

  return (
    <div
      css={css`
        position: relative;
        height: 24px;
      `}
    >
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="center"
        css={css`
          min-width: ${Math.max(100 - left, 0)}%;
          position: absolute;
          right: 0;
          & > div:last-child {
            margin-right: 8px;
          }
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiText css={{ overflow: 'hidden' }} size="s">
            <TruncateWithTooltip content={item.name} text={item.name} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {asDuration(item.duration)}
          </EuiText>
        </EuiFlexItem>
        {item.hasError ? (
          <EuiFlexItem grow={false}>
            {onErrorClick ? (
              <EuiButtonIcon
                aria-label={i18n.translate('xpack.apm.barDetails.errorButton.ariaLabel', {
                  defaultMessage: 'View error details',
                })}
                data-test-subj="apmBarDetailsButton"
                color="danger"
                iconType="errorFilled"
                iconSize="s"
                onClick={(e: React.MouseEvent) => {
                  if (onErrorClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    onErrorClick({ traceId: item.traceId, docId: item.id });
                  }
                }}
              />
            ) : (
              <EuiIcon type="errorFilled" color={theme.euiTheme.colors.danger} size="s" />
            )}
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
}
