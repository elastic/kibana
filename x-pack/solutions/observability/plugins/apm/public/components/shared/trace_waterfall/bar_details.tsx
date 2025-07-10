/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
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
import { useTraceWaterfallContext } from './trace_waterfall_context';

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
  const { getRelatedErrorsHref } = useTraceWaterfallContext();

  const viewRelatedErrorsLabel =
    item.errorCount > 1
      ? i18n.translate('xpack.apm.waterfall.embeddableRelatedErrors.unifedErrorCount', {
          defaultMessage: 'View {count} related errors',
          values: { count: item.errorCount },
        })
      : i18n.translate('xpack.apm.waterfall.embeddableRelatedErrors.unifedErrorCount.default', {
          defaultMessage: 'View related error',
        });

  return (
    <div
      css={css`
        position: relative;
        height: ${theme.euiTheme.size.l};
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
          max-width: 100%;
          margin-top: ${theme.euiTheme.size.xxs};
          & > div:last-child {
            margin-right: ${theme.euiTheme.size.s};
            white-space: nowrap;
          }
        `}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 0;
          `}
        >
          <EuiText css={{ overflow: 'hidden' }} size="s">
            <TruncateWithTooltip content={item.name} text={item.name} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {asDuration(item.duration)}
          </EuiText>
        </EuiFlexItem>
        {item.isFailure && (
          <EuiFlexItem grow={false}>
            <EuiBadge data-test-subj="apmBarDetailsFailureBadge" color="danger">
              {i18n.translate('xpack.apm.barDetails.failure', {
                defaultMessage: 'failure',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {item.errorCount > 0 ? (
          <EuiFlexItem grow={false}>
            {onErrorClick ? (
              <EuiButtonIcon
                aria-label={i18n.translate('xpack.apm.barDetails.errorButton.ariaLabel', {
                  defaultMessage: 'View error details',
                })}
                data-test-subj="apmBarDetailsErrorButton"
                color="danger"
                iconType="errorFilled"
                iconSize="s"
                href={getRelatedErrorsHref ? (getRelatedErrorsHref(item.id) as any) : undefined}
                onClick={(e: React.MouseEvent) => {
                  if (onErrorClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    onErrorClick({ traceId: item.traceId, docId: item.id });
                  }
                }}
              />
            ) : getRelatedErrorsHref ? (
              // eslint-disable-next-line @elastic/eui/href-or-on-click
              <EuiBadge
                color={theme.euiTheme.colors.danger}
                iconType="arrowRight"
                href={getRelatedErrorsHref(item.id) as any}
                onClick={(e: React.MouseEvent | React.KeyboardEvent) => {
                  e.stopPropagation();
                }}
                tabIndex={0}
                role="button"
                aria-label={viewRelatedErrorsLabel}
                onClickAriaLabel={viewRelatedErrorsLabel}
                data-test-subj="apmBarDetailsErrorBadge"
              >
                {viewRelatedErrorsLabel}
              </EuiBadge>
            ) : (
              <EuiIcon
                type="errorFilled"
                color={theme.euiTheme.colors.danger}
                size="s"
                data-test-subj="apmBarDetailsErrorIcon"
              />
            )}
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
}
