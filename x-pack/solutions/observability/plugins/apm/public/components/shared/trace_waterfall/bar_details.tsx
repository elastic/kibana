/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asDuration } from '../../../../common/utils/formatters';
import { TruncateWithTooltip } from '../truncate_with_tooltip';
import { useTraceWaterfallContext } from './trace_waterfall_context';
import { isFailureOrError } from './utils/is_failure_or_error';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { SpanLinksBadge, SyncBadge, ColdStartBadge } from './badges';

const ORPHAN_TITLE = i18n.translate('xpack.apm.trace.barDetails.euiIconTip.orphanTitleLabel', {
  defaultMessage: 'Orphan',
});
const ORPHAN_CONTENT = i18n.translate(
  'xpack.apm.trace.barDetails.euiIconTip.orphanSpanContentLabel',
  {
    defaultMessage:
      'This span is orphaned due to missing trace context and has been reparented to the root to restore the execution flow',
  }
);

export function BarDetails({ item, left }: { item: TraceWaterfallItem; left: number }) {
  const theme = useEuiTheme();
  const { getRelatedErrorsHref, onErrorClick } = useTraceWaterfallContext();
  const itemStatusIsFailureOrError = isFailureOrError(item.status?.value);
  const errorCount = item.errors.length;

  const viewRelatedErrorsLabel = i18n.translate(
    'xpack.apm.waterfall.embeddableRelatedErrors.unifedErrorCount',
    {
      defaultMessage: '{count, plural, one {View error} other {View # errors}}',
      values: {
        count: errorCount,
      },
    }
  );

  const compositePrefix = item.composite?.compressionStrategy === 'exact_match' ? 'x' : '';

  const displayName = item.composite
    ? `${item.composite.count}${compositePrefix} ${item.name}`
    : item.name;

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
        {item.icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={item.icon} data-test-subj="apmBarDetailsIcon" />
          </EuiFlexItem>
        )}
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 0;
          `}
        >
          <EuiText css={{ overflow: 'hidden' }} size="s">
            <TruncateWithTooltip content={displayName} text={displayName} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {asDuration(item.duration)}
          </EuiText>
        </EuiFlexItem>
        {item.status && itemStatusIsFailureOrError && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              data-test-subj="apmBarDetailsFailureTooltip"
              content={`${item.status.fieldName} = ${item.status.value}`}
            >
              <EuiBadge data-test-subj="apmBarDetailsFailureBadge" color="danger" tabIndex={0}>
                {item.status.value}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        {errorCount > 0 ? (
          <EuiFlexItem grow={false}>
            {getRelatedErrorsHref || onErrorClick ? (
              // eslint-disable-next-line @elastic/eui/href-or-on-click
              <EuiBadge
                color={theme.euiTheme.colors.danger}
                iconType="arrowRight"
                href={getRelatedErrorsHref?.(item.id) as any}
                onClick={(e: React.MouseEvent | React.KeyboardEvent) => {
                  if (onErrorClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    onErrorClick({
                      traceId: item.traceId,
                      docId: item.id,
                      errorCount,
                      errorDocId: errorCount > 1 ? undefined : item.errors[0].errorDocId,
                    });
                  }
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
        {item.isOrphan ? (
          <EuiFlexItem grow={false}>
            <EuiIconTip
              data-test-subj="apmBarDetailsOrphanTooltip"
              iconProps={{
                'data-test-subj': 'apmBarDetailsOrphanIcon',
                'aria-label': ORPHAN_TITLE,
              }}
              color={theme.euiTheme.colors.danger}
              type="unlink"
              title={ORPHAN_TITLE}
              content={ORPHAN_CONTENT}
            />
          </EuiFlexItem>
        ) : null}
        <SyncBadge sync={item.sync} agentName={item.agentName} />
        <SpanLinksBadge
          outgoingCount={item.spanLinksCount.outgoing}
          incomingCount={item.spanLinksCount.incoming}
          id={item.id}
        />
        {item.coldstart && <ColdStartBadge />}
      </EuiFlexGroup>
    </div>
  );
}
