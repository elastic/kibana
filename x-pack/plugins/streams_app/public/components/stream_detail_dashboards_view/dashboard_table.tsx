/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Dashboard } from '@kbn/streams-plugin/common/assets';
import React, { useMemo } from 'react';

export function DashboardsTable({
  dashboards,
  compact = false,
  selecedDashboards: selectedDashboards,
  setSelectedDashboards,
  loading,
}: {
  loading: boolean;
  dashboards: Dashboard[] | undefined;
  compact?: boolean;
  selecedDashboards: Dashboard[];
  setSelectedDashboards: (dashboards: Dashboard[]) => void;
}) {
  const columns = useMemo((): Array<EuiBasicTableColumn<Dashboard>> => {
    return [
      {
        field: 'label',
        name: i18n.translate('xpack.streams.dashboardTable.dashboardNameColumnTitle', {
          defaultMessage: 'Dashboard name',
        }),
      },
      ...(!compact
        ? ([
            {
              field: 'tags',
              name: i18n.translate('xpack.streams.dashboardTable.tagsColumnTitle', {
                defaultMessage: 'Tags',
              }),
              render: (_, { tags }) => {
                return (
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                    {tags.map((tag) => (
                      <EuiBadge key={tag} color="hollow">
                        {tag}
                      </EuiBadge>
                    ))}
                  </EuiFlexGroup>
                );
              },
            },
          ] satisfies Array<EuiBasicTableColumn<Dashboard>>)
        : []),
    ];
  }, [compact]);

  const items = useMemo(() => {
    return dashboards ?? [];
  }, [dashboards]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} />
      <EuiBasicTable
        columns={columns}
        itemId="assetId"
        items={items}
        loading={loading}
        selection={{
          onSelectionChange: (newSelection: Dashboard[]) => {
            setSelectedDashboards(newSelection);
          },
          selected: selectedDashboards,
        }}
      />
    </EuiFlexGroup>
  );
}
