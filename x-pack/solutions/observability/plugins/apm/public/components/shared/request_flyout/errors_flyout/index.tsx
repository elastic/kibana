/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiSpacer,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { FailedCallBucket } from '@kbn/apm-api-shared';
import { Timestamp } from '@kbn/apm-ui-shared';
import { UnifiedDocViewerObservabilityTraceDocFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import React, { useMemo, useState } from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { asInteger } from '../../../../../common/utils/formatters';
import { useAdHocApmDataView } from '../../../../hooks/use_adhoc_apm_data_view';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutFetcher } from '../use_request_flyout_fetcher';
import { useLogsIndexPattern } from '../../../../hooks/use_logs_index_pattern';
import { useServiceErrorsFromLogs } from '../../../app/error_group_overview/errors_from_logs/use_service_errors_from_logs';
import { RequestFlyoutApmErrorGroupFlyout } from '../apm_error_group_flyout';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { usePopoverFetchOptions } from '../../../app/service_map/popover/popover_fetch_options_context';
import { ExpandableNameCell } from '../expandable_name_cell';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useTablePagination } from '../use_table_pagination';
import { groupLogErrors, type LogErrorGroup } from './group_log_errors';

interface Props {
  bucket: FailedCallBucket;
  historyKey: symbol;
  onClose: () => void;
}

interface ApmErrorGroupRow {
  groupId: string;
  name: string;
  lastSeen: number;
  occurrences: number;
}

/** The single child flyout of the errors flyout: an APM error group or a log error document. */
type SelectedChild =
  | { kind: 'apm'; key: string; groupId: string; name: string }
  | { kind: 'log'; key: string; docId: string; docIndex?: string; traceId: string };

/**
 * Errors of the service that failed, opened from the top error of a failed calls bucket: the APM
 * error groups and the error logs, like the errors page, built from its route-free pieces.
 */
export function RequestFlyoutErrorsFlyout({ bucket, historyKey, onClose }: Props) {
  const {
    connection: { sourceServiceName, targetServiceName },
    filters: { environment, start, end, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();

  // Server failures belong to the target service, the others to the source. The failed-calls
  // lookup matches the target through the parent id without filtering its environment, so the
  // target's errors are not scoped to the map's environment either.
  const targetBucketService = bucket.type === 'server' ? targetServiceName : undefined;
  const serviceName = targetBucketService ?? sourceServiceName;
  const errorsEnvironment = targetBucketService ? ENVIRONMENT_ALL.value : environment;

  const [selected, setSelected] = useState<SelectedChild | null>(null);
  const toggle = (child: SelectedChild) =>
    setSelected((previous) => (previous?.key === child.key ? null : child));

  const { dataView, apmIndices } = useAdHocApmDataView();
  const { logsIndexPattern } = useLogsIndexPattern();
  const indexes = useMemo(
    () => ({
      logs: logsIndexPattern,
      apm: { traces: apmIndices?.transaction, errors: apmIndices?.error },
    }),
    [logsIndexPattern, apmIndices?.transaction, apmIndices?.error]
  );

  const { data: apmData, status: apmStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/services/{serviceName}/errors/groups/main_statistics', {
        params: {
          path: { serviceName },
          query: { environment: errorsEnvironment, start, end, kuery: '' },
        },
      }),
    [serviceName, errorsEnvironment, start, end]
  );

  // The error group of the bucket comes first.
  const apmGroups: ApmErrorGroupRow[] = useMemo(() => {
    const isOfBucket = ({ groupId }: ApmErrorGroupRow) => groupId === bucket.topErrorGroupId;
    return [...(apmData?.errorGroups ?? [])].sort(
      (a, b) => Number(isOfBucket(b)) - Number(isOfBucket(a))
    );
  }, [apmData, bucket.topErrorGroupId]);

  const { showToastOnError } = usePopoverFetchOptions();
  const {
    rows: logRows,
    status: logsStatus,
    isLoading: logsLoading,
  } = useServiceErrorsFromLogs({
    serviceName,
    environment: errorsEnvironment,
    kuery: '',
    rangeFrom,
    rangeTo,
    showToastOnError,
  });
  const logGroups = useMemo(() => groupLogErrors(logRows), [logRows]);

  const apmGroupsTable = useTablePagination(apmGroups);
  const logGroupsTable = useTablePagination(logGroups);

  const apmColumns: Array<EuiBasicTableColumn<ApmErrorGroupRow>> = [
    {
      field: 'name',
      width: '40%',
      name: i18n.translate('xpack.apm.requestFlyout.errors.apm.column.name', {
        defaultMessage: 'Error',
      }),
      render: (name: string, { groupId }: ApmErrorGroupRow) => {
        const child: SelectedChild = { kind: 'apm', key: `apm:${groupId}`, groupId, name };
        return (
          <ExpandableNameCell
            data-test-subj="requestFlyoutApmErrorGroupLink"
            ebtElement={REQUEST_FLYOUT_EBT_ELEMENTS.APM_ERROR_GROUP_NAME}
            name={name}
            isExpanded={selected?.key === child.key}
            onToggle={() => toggle(child)}
          />
        );
      },
    },
    {
      field: 'occurrences',
      name: i18n.translate('xpack.apm.requestFlyout.errors.apm.column.occurrences', {
        defaultMessage: 'Occurrences',
      }),
      align: 'right' as const,
      render: (value: number) => asInteger(value),
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.apm.requestFlyout.errors.apm.column.lastSeen', {
        defaultMessage: 'Last seen',
      }),
      align: 'right' as const,
      render: (value: number) => <Timestamp timestamp={value} renderMode="tooltip" />,
    },
  ];

  const logColumns: Array<EuiBasicTableColumn<LogErrorGroup>> = [
    {
      field: 'message',
      width: '40%',
      name: i18n.translate('xpack.apm.requestFlyout.errors.logs.column.message', {
        defaultMessage: 'Error',
      }),
      render: (message: string, group: LogErrorGroup) => {
        const child: SelectedChild = {
          kind: 'log',
          key: `log:${group.key}`,
          docId: group.sample.id,
          docIndex: group.sample.index,
          traceId: group.sample.traceId ?? '',
        };
        return (
          <ExpandableNameCell
            data-test-subj="requestFlyoutLogErrorGroupLink"
            ebtElement={REQUEST_FLYOUT_EBT_ELEMENTS.LOG_ERROR_NAME}
            name={message || group.type}
            isExpanded={selected?.key === child.key}
            // The document flyout needs the data view: ignore clicks until it is ready.
            onToggle={() => dataView && toggle(child)}
          />
        );
      },
    },
    {
      field: 'type',
      name: i18n.translate('xpack.apm.requestFlyout.errors.logs.column.type', {
        defaultMessage: 'Type',
      }),
      render: (type: string) => (type ? <EuiBadge color="hollow">{type}</EuiBadge> : '—'),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.apm.requestFlyout.errors.logs.column.count', {
        defaultMessage: 'Occurrences',
      }),
      align: 'right' as const,
      render: (value: number) => asInteger(value),
    },
    {
      field: 'lastSeenUs',
      name: i18n.translate('xpack.apm.requestFlyout.errors.logs.column.lastSeen', {
        defaultMessage: 'Last seen',
      }),
      align: 'right' as const,
      render: (value: number) => <Timestamp timestamp={value / 1000} renderMode="tooltip" />,
    },
  ];

  const title = bucket.topError ?? serviceName;

  return (
    <>
      <FlyoutTemplate
        data-test-subj="requestFlyoutErrorsFlyout"
        onClose={onClose}
        ownFocus={false}
        // Not `fill`: EUI rejects a `fill` child (an APM error group or a document) under a `fill`
        // parent.
        size="m"
        // A session of its own: this flyout opens a child, and EUI allows only one main and one
        // child flyout per session, so it cannot be a child itself.
        session="start"
        historyKey={historyKey}
      >
        <FlyoutTemplate.Header
          title={title}
          description={i18n.translate('xpack.apm.requestFlyout.errors.subtitle', {
            defaultMessage: 'Errors of {service}',
            values: { service: serviceName },
          })}
        />
        <FlyoutTemplate.Body>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.requestFlyout.errors.apm.title', {
                defaultMessage: 'APM errors',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiBasicTable
            columns={apmColumns}
            items={apmGroupsTable.pageItems}
            pagination={apmGroupsTable.pagination}
            onChange={apmGroupsTable.onTableChange}
            loading={isPending(apmStatus)}
            error={
              apmStatus === FETCH_STATUS.FAILURE
                ? i18n.translate('xpack.apm.requestFlyout.errors.apm.errorLabel', {
                    defaultMessage: 'Unable to load the APM errors.',
                  })
                : undefined
            }
            noItemsMessage={i18n.translate('xpack.apm.requestFlyout.errors.apm.noData', {
              defaultMessage: 'No APM errors found in this time range.',
            })}
            rowProps={({ groupId }) => ({
              'data-test-subj':
                groupId === bucket.topErrorGroupId
                  ? 'requestFlyoutTopErrorGroupRow'
                  : 'requestFlyoutApmErrorGroupRow',
            })}
            tableCaption={i18n.translate('xpack.apm.requestFlyout.errors.apm.caption', {
              defaultMessage: 'APM error groups',
            })}
          />

          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.requestFlyout.errors.logs.title', {
                defaultMessage: 'Errors from logs',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <KbnInfoCallout
            size="s"
            title={i18n.translate('xpack.apm.requestFlyout.errors.logs.groupingNote', {
              defaultMessage:
                'Log errors are grouped by type and message, among the most recent log errors.',
            })}
          />
          <EuiSpacer size="s" />
          <EuiBasicTable
            columns={logColumns}
            items={logGroupsTable.pageItems}
            pagination={logGroupsTable.pagination}
            onChange={logGroupsTable.onTableChange}
            loading={logsLoading}
            error={
              logsStatus === FETCH_STATUS.FAILURE
                ? i18n.translate('xpack.apm.requestFlyout.errors.logs.errorLabel', {
                    defaultMessage: 'Unable to load the error logs.',
                  })
                : undefined
            }
            noItemsMessage={i18n.translate('xpack.apm.requestFlyout.errors.logs.noData', {
              defaultMessage: 'No error logs found in this time range.',
            })}
            rowProps={() => ({ 'data-test-subj': 'requestFlyoutLogErrorGroupRow' })}
            tableCaption={i18n.translate('xpack.apm.requestFlyout.errors.logs.caption', {
              defaultMessage: 'Error logs grouped by type and message',
            })}
          />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>

      {selected?.kind === 'apm' && (
        <RequestFlyoutApmErrorGroupFlyout
          key={selected.key}
          serviceName={serviceName}
          environment={errorsEnvironment}
          groupId={selected.groupId}
          groupName={selected.name}
          historyKey={historyKey}
          onClose={() => setSelected(null)}
        />
      )}

      {selected?.kind === 'log' && dataView && (
        <UnifiedDocViewerObservabilityTraceDocFlyout
          key={selected.key}
          type="log"
          docId={selected.docId}
          docIndex={selected.docIndex}
          traceId={selected.traceId}
          dataView={dataView}
          indexes={indexes}
          onCloseFlyout={() => setSelected(null)}
          dataTestSubj="requestFlyoutErrorDocFlyout"
          size="fill"
          historyKey={historyKey}
        />
      )}
    </>
  );
}
