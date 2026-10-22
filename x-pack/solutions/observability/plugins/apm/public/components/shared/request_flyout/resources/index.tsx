/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBasicTable, EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { ImpactBar } from '../../impact_bar';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ExpandableNameCell } from '../expandable_name_cell';
import { useRequestFlyoutChild } from '../request_flyout_child';
import type { ResourceRow } from './get_top_resources';
import { MAX_RESOURCES_SHOWN, useRequestFlyoutResources } from './use_request_flyout_resources';

/**
 * Resources of a grouped edge (a service calling several resources of the same type): one row per
 * resource with the calls of the source service to it. A row opens a child flyout scoped to that
 * resource, where its operations and failed calls are, so this table stays small however many
 * resources are grouped.
 */
export function RequestFlyoutResources() {
  const { toggleChild, isChildSelected } = useRequestFlyoutChild();
  const { items, totalResources, isLoading, hasError } = useRequestFlyoutResources();

  const columns: Array<EuiBasicTableColumn<ResourceRow>> = [
    {
      field: 'resource',
      width: '38%',
      name: i18n.translate('xpack.apm.requestFlyout.resources.column.resource', {
        defaultMessage: 'Resource',
      }),
      render: (resource: string) => {
        const child = { kind: 'resource' as const, resource };
        return (
          <ExpandableNameCell
            data-test-subj="requestFlyoutResourceLink"
            ebtElement={REQUEST_FLYOUT_EBT_ELEMENTS.RESOURCE_NAME}
            name={resource}
            isExpanded={isChildSelected(child)}
            onToggle={() => toggleChild(child)}
          />
        );
      },
    },
    {
      field: 'spanSubtype',
      name: i18n.translate('xpack.apm.requestFlyout.resources.column.type', {
        defaultMessage: 'Type',
      }),
      width: '12%',
      render: (subtype: string | undefined) =>
        subtype ? <EuiBadge color="hollow">{subtype}</EuiBadge> : '—',
    },
    {
      field: 'latency',
      name: i18n.translate('xpack.apm.requestFlyout.resources.column.avgTime', {
        defaultMessage: 'Avg time',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asMillisecondDuration(value)),
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.requestFlyout.resources.column.calls', {
        defaultMessage: 'Calls',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asTransactionRate(value)),
    },
    {
      field: 'failureRate',
      name: i18n.translate('xpack.apm.requestFlyout.resources.column.failed', {
        defaultMessage: 'Failed',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asPercent(value, 1)),
    },
    {
      field: 'impact',
      name: i18n.translate('xpack.apm.requestFlyout.resources.column.timeConsumed', {
        defaultMessage: 'Time consumed',
      }),
      align: 'right' as const,
      render: (value: number) => <ImpactBar value={value} size="m" />,
    },
  ];

  return (
    <section data-test-subj="requestFlyoutSection-resources">
      <EuiBasicTable
        columns={columns}
        items={items}
        loading={isLoading}
        error={
          hasError
            ? i18n.translate('xpack.apm.requestFlyout.resources.errorLabel', {
                defaultMessage: 'Unable to load the resources of this connection.',
              })
            : undefined
        }
        noItemsMessage={
          isLoading
            ? i18n.translate('xpack.apm.requestFlyout.resources.loadingLabel', {
                defaultMessage: 'Loading resources…',
              })
            : i18n.translate('xpack.apm.requestFlyout.resources.noDataLabel', {
                defaultMessage: 'No calls to these resources in the selected time range.',
              })
        }
        rowProps={() => ({ 'data-test-subj': 'requestFlyoutResourceRow' })}
        tableCaption={i18n.translate('xpack.apm.requestFlyout.resources.tableCaption', {
          defaultMessage: 'Resources called by the source service',
        })}
        data-test-subj="requestFlyoutResourcesTable"
      />
      {totalResources > MAX_RESOURCES_SHOWN && (
        <EuiText size="xs" color="subdued" data-test-subj="requestFlyoutResourcesTopN">
          {i18n.translate('xpack.apm.requestFlyout.resources.topN', {
            defaultMessage: 'Top {shown} of {total} resources, by time consumed',
            values: { shown: items.length, total: totalResources },
          })}
        </EuiText>
      )}
    </section>
  );
}
