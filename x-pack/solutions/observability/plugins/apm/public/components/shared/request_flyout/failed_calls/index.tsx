/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButtonIcon,
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
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import type { FailedCallBucket } from '@kbn/apm-api-shared';
import React, { useCallback } from 'react';
import { ActionsContextMenu, type ActionGroups } from '../../actions_context_menu';
import { asPercent } from '../../../../../common/utils/formatters';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getESQLQuery } from '../../links/discover_links/get_esql_query';
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
  const { buckets, totalFailed, totalCalls, isSampled, isLoading } = useRequestFlyoutFailedCalls();

  // Discover link — built per-row using getESQLQuery (pure function).
  const { indexSettings = [] } = useApmIndexSettingsContext();
  const { share } = useApmPluginContext();
  const discoverLocator = share?.url.locators.get(DISCOVER_APP_LOCATOR);

  const buildDiscoverHref = useCallback(
    (item: FailedCallBucket): string | undefined => {
      // Use the target service for server-side errors; the source for everything else.
      const serviceName =
        item.type === 'server' && targetServiceName ? targetServiceName : sourceServiceName;
      const esqlQuery = getESQLQuery({
        indexType: 'traces',
        params: {
          serviceName,
          kuery: 'event.outcome : "failure"',
          environment,
          sortDirection: 'DESC',
        },
        indexSettings,
      });
      if (!esqlQuery || !discoverLocator) return undefined;
      return discoverLocator.getRedirectUrl({
        timeRange: { from: rangeFrom, to: rangeTo },
        query: { esql: esqlQuery },
      });
    },
    [
      sourceServiceName,
      targetServiceName,
      environment,
      rangeFrom,
      rangeTo,
      indexSettings,
      discoverLocator,
    ]
  );

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
      query: {
        environment,
        rangeFrom,
        rangeTo,
        kuery: '',
        serviceGroup: '',
        comparisonEnabled: false,
      },
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
              <EuiLink data-test-subj="apmColumnsLink" href={href}>
                {truncated}
              </EuiLink>
            </EuiToolTip>
          ) : (
            <EuiLink data-test-subj="apmColumnsLink" href={href}>
              {topError}
            </EuiLink>
          );
        }
        return truncated !== topError ? (
          <EuiToolTip content={topError}>
            {/* tabIndex makes the non-interactive EuiText focusable for a11y */}
            <EuiText size="s" tabIndex={0}>{truncated}</EuiText>
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
    {
      field: 'count',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.failureRate', {
        defaultMessage: 'Failed %',
      }),
      align: 'right' as const,
      render: (_count: number, item: FailedCallBucket) =>
        totalCalls > 0 ? asPercent(item.count, totalCalls) : '—',
    },
    {
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.actions', {
        defaultMessage: 'Actions',
      }),
      align: 'right' as const,
      render: (item: FailedCallBucket) => {
        const discoverHref = buildDiscoverHref(item);
        const traceHref = item.sampleTraceId
          ? link('/link-to/trace/{traceId}', {
              path: { traceId: item.sampleTraceId },
              query: { rangeFrom, rangeTo },
            })
          : undefined;
        if (!discoverHref && !traceHref) return null;
        const menuActions: ActionGroups = [
          {
            id: 'failedCallActions',
            actions: [
              ...(discoverHref
                ? [
                    {
                      id: 'viewInDiscover',
                      name: i18n.translate(
                        'xpack.apm.requestFlyout.failedCalls.action.viewInDiscover',
                        { defaultMessage: 'View in Discover' }
                      ),
                      icon: 'discoverApp',
                      href: discoverHref,
                    },
                  ]
                : []),
              ...(traceHref
                ? [
                    {
                      id: 'openTrace',
                      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.action.openTrace', {
                        defaultMessage: 'Open a failed trace',
                      }),
                      icon: 'timeline',
                      href: traceHref,
                    },
                  ]
                : []),
            ],
          },
        ];
        return (
          <ActionsContextMenu
            id={`failedCallsActions-${item.type}`}
            actions={menuActions}
            dataTestSubjPrefix="requestFlyoutFailedCallsActions"
            button={
              // eslint-disable-next-line @elastic/eui/tooltip-button-icon-wrap
              <EuiButtonIcon
                data-test-subj="requestFlyoutFailedCallsActionsButton"
                aria-label={i18n.translate(
                  'xpack.apm.requestFlyout.failedCalls.actions.ariaLabel',
                  { defaultMessage: 'Actions' }
                )}
                iconType="boxesVertical"
                color="text"
              />
            }
          />
        );
      },
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
            <EuiLink href={seeAllErrorsHref} data-test-subj="requestFlyoutSeeAllErrors">
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
                announceOnMount
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
            tableCaption={i18n.translate(
              'xpack.apm.requestFlyout.failedCalls.tableCaption',
              { defaultMessage: 'Failed calls broken down by where they failed' }
            )}
            data-test-subj="requestFlyoutFailedCallsTable"
          />
        </>
      )}
    </section>
  );
}
