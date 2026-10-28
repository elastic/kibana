/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type { FailedCallBucket } from '@kbn/apm-api-shared';
import React, { useMemo } from 'react';
import { asInteger, asPercent } from '../../../../../common/utils/formatters';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ExpandableNameCell } from '../expandable_name_cell';
import { useRequestFlyoutChild } from '../request_flyout_child';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { RowActionsMenu } from '../row_actions_menu';
import { useDiscoverHrefBuilder } from '../use_discover_href_builder';
import { getBucketLabel } from './get_bucket_label';
import { useRequestFlyoutFailedCalls } from './use_request_flyout_failed_calls';

/**
 * Failed calls of the connection by where they failed, highest failure rate first. The top error
 * of a bucket opens the errors of the failing service in a child flyout.
 */
export function RequestFlyoutFailedCalls() {
  const {
    connection: { sourceServiceName, targetServiceName, dependencyName, sourceLabel, targetLabel },
    filters: { environment, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();

  const { link } = useApmRouter();
  const { toggleChild, isChildSelected } = useRequestFlyoutChild();
  const getDiscoverHref = useDiscoverHrefBuilder();
  const { buckets, totalFailed, totalCalls, isSampled, isApplicable, isLoading, hasError } =
    useRequestFlyoutFailedCalls();

  // The failure rate is count / totalCalls, so ordering by count is the same.
  const bucketsByFailureRate = useMemo(
    () => [...buckets].sort((a, b) => b.count - a.count),
    [buckets]
  );

  const columns: Array<EuiBasicTableColumn<FailedCallBucket>> = [
    {
      field: 'topError',
      width: '30%',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.topError', {
        defaultMessage: 'Top error',
      }),
      render: (topError: string | null, bucket: FailedCallBucket) => {
        if (!topError) {
          return (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.apm.requestFlyout.failedCalls.noError', {
                defaultMessage: 'none',
              })}
            </EuiText>
          );
        }
        // Only an APM error group can be opened: HTTP and gRPC status labels have no error
        // document behind them.
        if (!bucket.topErrorGroupId) {
          return <EuiText size="s">{topError}</EuiText>;
        }
        const child = { kind: 'error' as const, bucket };
        return (
          <ExpandableNameCell
            data-test-subj="requestFlyoutTopErrorLink"
            ebtElement={REQUEST_FLYOUT_EBT_ELEMENTS.TOP_ERROR}
            name={topError}
            isExpanded={isChildSelected(child)}
            onToggle={() => toggleChild(child)}
          />
        );
      },
    },
    {
      field: 'type',
      width: '42%',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.failedAt', {
        defaultMessage: 'Failed at',
      }),
      render: (type: FailedCallBucket['type']) => {
        const { primary, hint } = getBucketLabel({ type, sourceLabel, targetLabel });
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
      field: 'count',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.calls', {
        defaultMessage: 'Calls',
      }),
      align: 'right' as const,
      render: (count: number) => asInteger(count),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.failureRate', {
        defaultMessage: 'Failed %',
      }),
      align: 'right' as const,
      render: (count: number) => (totalCalls > 0 ? asPercent(count, totalCalls) : '—'),
    },
    {
      name: i18n.translate('xpack.apm.requestFlyout.failedCalls.column.actions', {
        defaultMessage: 'Actions',
      }),
      align: 'right' as const,
      render: ({ type, sampleTraceId }: FailedCallBucket) => {
        const discoverHref = getDiscoverHref({
          // Server errors are the target's; the others are the source's.
          serviceName:
            type === 'server' && targetServiceName ? targetServiceName : sourceServiceName,
          dependencyName: type === 'dependency' ? dependencyName : undefined,
          kuery: 'event.outcome : "failure"',
          environment,
          sortDirection: 'DESC',
        });
        const traceHref = sampleTraceId
          ? link('/link-to/trace/{traceId}', {
              path: { traceId: sampleTraceId },
              query: { rangeFrom, rangeTo },
            })
          : undefined;
        if (!discoverHref && !traceHref) {
          return null;
        }
        return (
          <RowActionsMenu
            id={`requestFlyoutFailedCallsActions-${type}`}
            actions={[
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
                          ebt: {
                            action: APM_EBT_ACTIONS.EXPLORE_TRACES,
                            element: REQUEST_FLYOUT_EBT_ELEMENTS.ROW_ACTIONS_MENU,
                          },
                        },
                      ]
                    : []),
                  ...(traceHref
                    ? [
                        {
                          id: 'openTrace',
                          name: i18n.translate(
                            'xpack.apm.requestFlyout.failedCalls.action.openTrace',
                            { defaultMessage: 'Open a failed trace' }
                          ),
                          icon: 'timeline',
                          href: traceHref,
                          ebt: {
                            action: EBT_CLICK_ACTIONS.VIEW_SPAN,
                            element: REQUEST_FLYOUT_EBT_ELEMENTS.ROW_ACTIONS_MENU,
                          },
                        },
                      ]
                    : []),
                ],
              },
            ]}
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
            <EuiLink
              href={seeAllErrorsHref}
              data-test-subj="requestFlyoutSeeAllErrors"
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.VIEW_ERROR,
                element: REQUEST_FLYOUT_EBT_ELEMENTS.DETAIL_LINK,
              })}
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

      {!isApplicable ? (
        <EuiText size="s" color="subdued" data-test-subj="requestFlyoutFailedCallsNotAvailable">
          {i18n.translate('xpack.apm.requestFlyout.failedCalls.notAvailable', {
            defaultMessage:
              'Failed calls are not available for this connection: the resources it calls are unknown.',
          })}
        </EuiText>
      ) : !isLoading && !hasError && !hasFailures ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.apm.requestFlyout.failedCalls.noFailures', {
            defaultMessage: 'No failed calls in this time range.',
          })}
        </EuiText>
      ) : (
        <>
          {isSampled && (
            <>
              <KbnWarningCallout
                size="s"
                title={i18n.translate('xpack.apm.requestFlyout.failedCalls.sampledWarning', {
                  defaultMessage:
                    'Not all failed calls are classified. The most recent failed calls are used.',
                })}
              />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiBasicTable
            columns={columns}
            items={bucketsByFailureRate}
            loading={isLoading}
            error={
              hasError
                ? i18n.translate('xpack.apm.requestFlyout.failedCalls.errorLabel', {
                    defaultMessage: 'Unable to load the failed calls of this connection.',
                  })
                : undefined
            }
            noItemsMessage={
              isLoading
                ? i18n.translate('xpack.apm.requestFlyout.failedCalls.loadingLabel', {
                    defaultMessage: 'Loading failed calls…',
                  })
                : i18n.translate('xpack.apm.requestFlyout.failedCalls.noDataLabel', {
                    defaultMessage: 'No failed calls found for this connection.',
                  })
            }
            rowProps={(bucket) => ({
              'data-test-subj': `requestFlyoutFailedCallsRow-${bucket.type}`,
            })}
            tableCaption={i18n.translate('xpack.apm.requestFlyout.failedCalls.tableCaption', {
              defaultMessage: 'Failed calls broken down by where they failed',
            })}
            data-test-subj="requestFlyoutFailedCallsTable"
          />
        </>
      )}
    </section>
  );
}
