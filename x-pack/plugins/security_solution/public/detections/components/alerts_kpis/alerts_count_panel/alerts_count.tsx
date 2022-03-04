/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress, EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import numeral from '@elastic/numeral';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import * as i18n from './translations';
import { DefaultDraggable } from '../../../../common/components/draggables';
import type { GenericBuckets } from '../../../../../common/search_strategy';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { AlertsCountAggregation } from './types';

interface AlertsCountProps {
  loading: boolean;
  data: AlertSearchResponse<unknown, AlertsCountAggregation> | null;
  selectedStackByOption: string;
}

const Wrapper = styled.div`
  margin-top: -${({ theme }) => theme.eui.euiSizeS};
`;

const getAlertsCountTableColumns = (
  selectedStackByOption: string,
  defaultNumberFormat: string
): Array<EuiBasicTableColumn<GenericBuckets>> => {
  return [
    {
      field: 'key',
      name: selectedStackByOption,
      truncateText: false,
      render: function DraggableStackOptionField(value: string) {
        return (
          <DefaultDraggable
            isDraggable={false}
            field={selectedStackByOption}
            hideTopN={true}
            id={`alert-count-draggable-${selectedStackByOption}-${value}`}
            value={value}
            tooltipContent={null}
          />
        );
      },
    },
    {
      field: 'doc_count',
      name: i18n.COUNT_TABLE_COLUMN_TITLE,
      sortable: true,
      textOnly: true,
      dataType: 'number',
      render: (item: string) => numeral(item).format(defaultNumberFormat),
    },
  ];
};

export const AlertsCount = memo<AlertsCountProps>(({ loading, selectedStackByOption, data }) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const listItems: GenericBuckets[] = data?.aggregations?.alertsByGroupingCount?.buckets ?? [];
  const tableColumns = useMemo(
    () => getAlertsCountTableColumns(selectedStackByOption, defaultNumberFormat),
    [selectedStackByOption, defaultNumberFormat]
  );

  return (
    <>
      {loading && <EuiProgress size="xs" position="absolute" color="accent" />}

      <Wrapper data-test-subj="alertsCountTable" className="eui-yScroll">
        <EuiInMemoryTable
          isSelectable={false}
          columns={tableColumns}
          items={listItems}
          loading={loading}
          sorting={true}
        />
      </Wrapper>
    </>
  );
});

AlertsCount.displayName = 'AlertsCount';
