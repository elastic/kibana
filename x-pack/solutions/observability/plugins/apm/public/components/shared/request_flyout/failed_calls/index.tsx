/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FailedCallBucket } from '@kbn/apm-api-shared';
import React from 'react';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useRequestFlyoutFailedCalls } from './use_request_flyout_failed_calls';

/**
 * Labels for each bucket type, including a short hint to explain the category.
 */
function getBucketLabel(
  type: FailedCallBucket['type'],
  sourceLabel: string,
  targetLabel: string
): { primary: string; hint: string } {
  switch (type) {
    case 'caller':
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.caller.label', {
          defaultMessage: '{source} (never reached {target})',
          values: { source: sourceLabel, target: targetLabel },
        }),
        hint: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.caller.hint', {
          defaultMessage: 'timeout / connection error',
        }),
      };
    case 'server':
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.server.label', {
          defaultMessage: '{target} (server error)',
          values: { target: targetLabel },
        }),
        hint: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.server.hint', {
          defaultMessage: '5xx / gRPC INTERNAL / UNAVAILABLE',
        }),
      };
    case 'client':
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.client.label', {
          defaultMessage: 'Client errors',
        }),
        hint: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.client.hint', {
          defaultMessage: '4xx / INVALID_ARGUMENT',
        }),
      };
    case 'dependency':
    default:
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.dependency.label', {
          defaultMessage: 'Call to {target} failed',
          values: { target: targetLabel },
        }),
        hint: '',
      };
  }
}

export function RequestFlyoutFailedCalls() {
  const {
    connection: { sourceServiceName, targetServiceName, sourceLabel, targetLabel },
    filters: { environment, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();

  const { link } = useApmRouter();
  const { buckets, totalFailed, isSampled, isLoading } = useRequestFlyoutFailedCalls();

  /**
   * Build a deep link to a specific APM error group page.
   * Only called when topErrorGroupId is non-null (i.e. the error came from a real APM doc).
   * server bucket → target service; everything else → source service.
   */
  function errorGroupHref(bucketType: FailedCallBucket['type'], groupId: string): string {
    const serviceName =
      bucketType === 'server' && targetServiceName ? targetServiceName : sourceServiceName;
    return link('/services/{serviceName}/errors/{groupId}', {
      path: { serviceName, groupId },
      query: {},
    });
  }

  const columns: Array<EuiBasicTableColumn<FailedCallBucket>> = [
    {
      field: 'type',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.failedAt', {
        defaultMessage: 'Failed at',
      }),
      render: (type: FailedCallBucket['type']) => {
        const { primary, hint } = getBucketLabel(type, sourceLabel, targetLabel);
        return (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiText size="s">{primary}</EuiText>
            </EuiFlexItem>
            {hint && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {hint}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'topError',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.topError', {
        defaultMessage: 'Top error',
      }),
      render: (topError: string | null, item: FailedCallBucket) => {
        if (!topError) {
          return (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.apm.requestFlyout.failedCalls.noError', {
                defaultMessage: 'none',
              })}
            </EuiText>
          );
        }
        const truncated = topError.length > 60 ? `${topError.slice(0, 60)}…` : topError;
        // Only link when we have a real APM error group — status-code labels (gRPC/HTTP)
        // have no corresponding error doc to link to.
        if (item.topErrorGroupId) {
          const href = errorGroupHref(item.type, item.topErrorGroupId);
          return truncated !== topError ? (
            <EuiToolTip content={topError}>
              <EuiLink href={href}>{truncated}</EuiLink>
            </EuiToolTip>
          ) : (
            <EuiLink href={href}>{topError}</EuiLink>
          );
        }
        return truncated !== topError ? (
          <EuiToolTip content={topError}>
            <EuiText size="s">{truncated}</EuiText>
          </EuiToolTip>
        ) : (
          <EuiText size="s">{topError}</EuiText>
        );
      },
    },
    {
      field: 'count',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.calls', {
        defaultMessage: 'Calls',
      }),
      align: 'right' as const,
      render: (count: number) => count.toLocaleString(),
    },
  ];

  const hasFailures = totalFailed > 0;

  const seeAllErrorsHref = link('/services/{serviceName}/errors', {
    path: { serviceName: sourceServiceName },
    query: {
      environment,
      rangeFrom,
      rangeTo,
      kuery: '',
      serviceGroup: '',
      comparisonEnabled: false,
    },
  });

  return (
    <section data-test-subj="requestFlyoutSection-failedCalls">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.requestFlyout.failedCalls.sectionTitle', {
                defaultMessage: 'Failed calls by where they failed',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {hasFailures && (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={seeAllErrorsHref}
              data-test-subj="requestFlyoutSeeAllErrors"
            >
              <EuiText size="s">
                {i18n.translate('xpack.apm.requestFlyout.failedCalls.seeAllErrors', {
                  defaultMessage: 'See all errors',
                })}
              </EuiText>
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {!isLoading && !hasFailures ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.apm.requestFlyout.failedCalls.noFailures', {
            defaultMessage: 'No failed calls in this time range.',
          })}
        </EuiText>
      ) : (
        <>
          {isSampled && (
            <>
              <EuiCallOut
                size="s"
                color="warning"
                iconType="warning"
                title={i18n.translate('xpack.apm.requestFlyout.failedCalls.sampledWarning', {
                  defaultMessage:
                    'Not all failed calls are shown. Results are based on a sample of {max} calls.',
                  values: { max: '1 000' },
                })}
              />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiBasicTable
            columns={columns}
            items={buckets}
            loading={isLoading}
            noItemsMessage={
              isLoading
                ? i18n.translate('xpack.apm.requestFlyout.failedCalls.loadingLabel', {
                    defaultMessage: 'Loading failed calls…',
                  })
                : i18n.translate('xpack.apm.requestFlyout.failedCalls.noDataLabel', {
                    defaultMessage: 'No failed calls found for this connection.',
                  })
            }
            data-test-subj="requestFlyoutFailedCallsTable"
          />
        </>
      )}
    </section>
  );
}
