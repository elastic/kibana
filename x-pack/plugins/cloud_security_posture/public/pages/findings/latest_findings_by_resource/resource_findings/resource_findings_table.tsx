/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiBasicTable,
  type CriteriaWithPagination,
  type Pagination,
  type EuiBasicTableColumn,
  type EuiTableActionsColumnType,
  type EuiBasicTableProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  baseFindingsColumns,
  createColumnWithFilters,
  getExpandColumn,
  type OnAddFilter,
} from '../../layout/findings_layout';
import type { CspFinding } from '../../types';
import { FindingsRuleFlyout } from '../../findings_flyout/findings_flyout';

interface Props {
  items: CspFinding[];
  loading: boolean;
  pagination: Pagination;
  sorting: Required<EuiBasicTableProps<CspFinding>>['sorting'];
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
  onAddFilter: OnAddFilter;
}

const ResourceFindingsTableComponent = ({
  items,
  loading,
  pagination,
  sorting,
  setTableOptions,
  onAddFilter,
}: Props) => {
  const [selectedFinding, setSelectedFinding] = useState<CspFinding>();

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiBasicTableColumn<CspFinding>>
  ] = useMemo(
    () => [
      getExpandColumn<CspFinding>({ onClick: setSelectedFinding }),
      baseFindingsColumns['resource.id'],
      createColumnWithFilters(baseFindingsColumns['result.evaluation'], { onAddFilter }),
      createColumnWithFilters(
        { ...baseFindingsColumns['resource.sub_type'], sortable: false },
        { onAddFilter }
      ),
      createColumnWithFilters(
        { ...baseFindingsColumns['resource.name'], sortable: false },
        { onAddFilter }
      ),
      createColumnWithFilters(baseFindingsColumns['rule.name'], { onAddFilter }),
      baseFindingsColumns['rule.section'],
      createColumnWithFilters(baseFindingsColumns.cluster_id, { onAddFilter }),
      baseFindingsColumns['@timestamp'],
    ],
    [onAddFilter]
  );
  if (!loading && !items.length)
    return (
      <EuiEmptyPrompt
        iconType="logoKibana"
        title={
          <h2>
            <FormattedMessage
              id="xpack.csp.findings.resourceFindings.noFindingsTitle"
              defaultMessage="There are no Findings"
            />
          </h2>
        }
      />
    );

  return (
    <>
      <EuiBasicTable
        loading={loading}
        items={items}
        columns={columns}
        onChange={setTableOptions}
        pagination={pagination}
        sorting={sorting}
      />
      {selectedFinding && (
        <FindingsRuleFlyout
          findings={selectedFinding}
          onClose={() => setSelectedFinding(undefined)}
        />
      )}
    </>
  );
};

export const ResourceFindingsTable = React.memo(ResourceFindingsTableComponent);
