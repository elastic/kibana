/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ReadDashboard } from '@kbn/streams-plugin/common/assets';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';

export function DashboardsTable({
  dashboards,
  compact = false,
  selecedDashboards: selectedDashboards,
  setSelectedDashboards,
  loading,
}: {
  loading: boolean;
  dashboards: ReadDashboard[] | undefined;
  compact?: boolean;
  selecedDashboards: ReadDashboard[];
  setSelectedDashboards: (dashboards: ReadDashboard[]) => void;
}) {
  const {
    dependencies: {
      start: {
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
      },
    },
  } = useKibana();
  const columns = useMemo((): Array<EuiBasicTableColumn<ReadDashboard>> => {
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
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" wrap>
                    <savedObjectsTaggingUi.components.TagList
                      object={{ references: tagListToReferenceList(tags) }}
                    />
                  </EuiFlexGroup>
                );
              },
            },
          ] satisfies Array<EuiBasicTableColumn<ReadDashboard>>)
        : []),
    ];
  }, [compact, savedObjectsTaggingUi]);

  const items = useMemo(() => {
    return dashboards ?? [];
  }, [dashboards]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} />
      <EuiBasicTable
        columns={columns}
        itemId="id"
        items={items}
        loading={loading}
        selection={{
          onSelectionChange: (newSelection: ReadDashboard[]) => {
            setSelectedDashboards(newSelection);
          },
          selected: selectedDashboards,
        }}
      />
    </EuiFlexGroup>
  );
}
