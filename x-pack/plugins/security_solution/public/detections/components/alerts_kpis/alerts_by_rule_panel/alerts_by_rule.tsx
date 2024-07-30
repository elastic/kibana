/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import type { AlertsByRuleData } from './types';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { DefaultDraggable } from '../../../../common/components/draggables';
import { ALERTS_HEADERS_RULE_NAME } from '../../alerts_table/translations';
import { COUNT_TABLE_TITLE } from '../alerts_count_panel/translations';

const Wrapper = styled.div`
  margin-top: -${({ theme }) => theme.eui.euiSizeM};
`;
const TableWrapper = styled.div`
  height: 178px;
`;

export interface AlertsByRuleProps {
  data: AlertsByRuleData[];
  isLoading: boolean;
}

const COLUMNS: Array<EuiBasicTableColumn<AlertsByRuleData>> = [
  {
    field: 'rule',
    name: ALERTS_HEADERS_RULE_NAME,
    'data-test-subj': 'detectionsTable-rule',
    truncateText: true,
    render: (rule: string) => (
      <EuiText size="xs" className="eui-textTruncate">
        <DefaultDraggable
          isDraggable={false}
          field={ALERT_RULE_NAME}
          hideTopN={true}
          id={`alert-detection-draggable-${rule}`}
          value={rule}
          queryValue={rule}
          tooltipContent={null}
          truncate={true}
          scopeId={TableId.alertsOnAlertsPage}
        />
      </EuiText>
    ),
  },
  {
    field: 'value',
    name: COUNT_TABLE_TITLE,
    dataType: 'number',
    sortable: true,
    'data-test-subj': 'detectionsTable-count',
    render: (count: number) => (
      <EuiText grow={false} size="xs">
        <FormattedCount count={count} />
      </EuiText>
    ),
    width: '22%',
  },
];

export const AlertsByRule: React.FC<AlertsByRuleProps> = ({ data, isLoading }) => {
  const sorting: { sort: { field: keyof AlertsByRuleData; direction: SortOrder } } = {
    sort: {
      field: 'value',
      direction: 'desc',
    },
  };

  const pagination: {} = {
    pageSize: 25,
    showPerPageOptions: false,
  };

  return (
    <Wrapper data-test-subj="alerts-by-rule">
      <EuiSpacer size="xs" />
      <TableWrapper className="eui-yScroll">
        <EuiInMemoryTable
          data-test-subj="alerts-by-rule-table"
          columns={COLUMNS}
          items={data}
          loading={isLoading}
          sorting={sorting}
          pagination={pagination}
        />
      </TableWrapper>
    </Wrapper>
  );
};

AlertsByRule.displayName = 'AlertsByRule';
