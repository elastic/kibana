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
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CspFinding } from '../../../../../common/schemas/csp_finding';
import {
  baseFindingsColumns,
  createColumnWithFilters,
  getExpandColumn,
  type OnAddFilter,
} from '../../layout/findings_layout';
import { FindingsRuleFlyout } from '../../findings_flyout/findings_flyout';
import { getSelectedRowStyle } from '../../utils/utils';

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
  const { euiTheme } = useEuiTheme();
  const [selectedFinding, setSelectedFinding] = useState<CspFinding>();

  const getRowProps = (row: CspFinding) => ({
    style: getSelectedRowStyle(euiTheme, row, selectedFinding),
  });

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiBasicTableColumn<CspFinding>>
  ] = useMemo(
    () => [
      getExpandColumn<CspFinding>({ onClick: setSelectedFinding }),
      createColumnWithFilters(baseFindingsColumns['result.evaluation'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.benchmark.name'], { onAddFilter }),
      baseFindingsColumns['rule.section'],
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
        rowProps={getRowProps}
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
