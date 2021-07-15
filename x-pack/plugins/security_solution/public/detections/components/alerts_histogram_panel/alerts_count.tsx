/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import numeral from '@elastic/numeral';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { AlertSearchResponse } from '../../containers/detection_engine/alerts/types';
import { AlertsAggregation } from './types';
import * as i18n from './translations';
import { DefaultDraggable } from '../../../common/components/draggables';
import { GenericBuckets } from '../../../../common';

interface AlertsCountProps {
  loading: boolean;
  data: AlertSearchResponse<unknown, AlertsAggregation> | null;
  selectedStackByOption: string;
}

const Wrapper = styled.div`
  overflow: scroll;
  margin-top: ${({ theme }) => theme.eui.euiSizeXS};
`;

const getAlertsCountTableColumns = (
  selectedStackByOption: string,
  defaultNumberFormat: string
): Array<EuiBasicTableColumn<GenericBuckets>> => {
  return [
    {
      field: 'key',
      name: selectedStackByOption,
      truncateText: true,
      render: function DraggableStackOptionField(item: string) {
        return (
          <DefaultDraggable
            field={selectedStackByOption}
            id={`alert-count-draggable-${selectedStackByOption}-${item}`}
            value={item}
          >
            {item}
          </DefaultDraggable>
        );
      },
    },
    {
      field: 'doc_count',
      name: i18n.COUNT_TABLE_COLUMN_TITLE,
      sortable: true,
      textOnly: true,
      render: (item: string) => numeral(item).format(defaultNumberFormat),
    },
  ];
};

export const AlertsCount = memo<AlertsCountProps>(({ data, loading, selectedStackByOption }) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const listItems = data?.aggregations?.alertsByGroupingCount?.buckets ?? [];
  const tableColumns = useMemo(
    () => getAlertsCountTableColumns(selectedStackByOption, defaultNumberFormat),
    [selectedStackByOption, defaultNumberFormat]
  );

  return (
    <Wrapper data-test-subj="alertsCountTable">
      <EuiInMemoryTable
        isSelectable={false}
        columns={tableColumns}
        items={listItems}
        loading={loading}
        sorting={true}
      />
    </Wrapper>
  );
});

AlertsCount.displayName = 'AlertsCount';
