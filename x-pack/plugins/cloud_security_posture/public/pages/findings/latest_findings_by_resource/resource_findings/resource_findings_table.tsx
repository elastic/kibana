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
  CriteriaWithPagination,
  Pagination,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import * as TEXT from '../../translations';
import { getExpandColumn, getFindingsColumns } from '../../layout/findings_layout';
import type { CspFinding } from '../../types';
import { FindingsRuleFlyout } from '../../findings_flyout/findings_flyout';

interface Props {
  items: CspFinding[];
  loading: boolean;
  pagination: Pagination;
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
}

const ResourceFindingsTableComponent = ({ items, loading, pagination, setTableOptions }: Props) => {
  const [selectedFinding, setSelectedFinding] = useState<CspFinding>();

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiBasicTableColumn<CspFinding>>
  ] = useMemo(
    () => [getExpandColumn<CspFinding>({ onClick: setSelectedFinding }), ...getFindingsColumns()],
    []
  );
  if (!loading && !items.length)
    return <EuiEmptyPrompt iconType="logoKibana" title={<h2>{TEXT.NO_FINDINGS}</h2>} />;

  return (
    <>
      <EuiBasicTable
        loading={loading}
        items={items}
        columns={columns}
        onChange={setTableOptions}
        pagination={pagination}
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
