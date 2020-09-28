/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiButton,
  EuiTitle,
  EuiLoadingChart,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import {
  niceTimeFormatter,
  ScaleType,
  Position,
  Settings,
  BarSeries,
  Axis,
  Chart,
} from '@elastic/charts';
import styled from 'styled-components';

import * as i18n from './translations';
import { useEqlAggs } from '../../../../common/hooks/eql/use_eql_aggregation';
import { useKibana, useTimeZone } from '../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../common/containers/source';
import { BarChart } from '../../../../common/components/charts/barchart';
import { histogramDateTimeFormatter } from '../../../../common/components/utils';
import { useTheme } from '../../../../common/components/charts/common';

const ID = 'alertsHistogramQueryPreview';

const FlexGroup = styled(EuiFlexGroup)`
  height: 220px;
  width: 100%;
  position: relative;
  margin: 0;
`;

const options = [
  { value: 'h', text: 'Last hour' },
  { value: 'd', text: 'Last day' },
  { value: 'M', text: 'Last month' },
  { value: 'y', text: 'Last year' },
];

interface QueryBarDefineRuleProps {
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
  index: string[];
}

// dynamically get from and to
// calculate bounds
// decide how to handle bounds you know they won't have data for

export const PreviewQuery = ({
  dataTestSubj,
  idAria,
  query,
  index,
  isDisabled = false,
}: QueryBarDefineRuleProps) => {
  const { data } = useKibana().services;
  const theme = useTheme();
  const timeZone = useTimeZone();
  const [_, { indexPatterns }] = useFetchIndex(index);
  const { error, start, result } = useEqlAggs();
  const [timeframe, setTimeframe] = useState('h');
  const [showHistogram, setShowHistogram] = useState(false);

  const handleSelectPreviewTimeframe = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>): void => {
      setTimeframe(value);
    },
    []
  );

  const handlePreviewClicked = useCallback((): void => {
    setShowHistogram(true);

    start({
      data,
      index,
      query: query.query.query,
      from: `now-1${timeframe}`,
      to: 'now',
      interval: timeframe,
      indexPatterns,
    });
  }, [start, data, index, query, indexPatterns, timeframe]);

  return (
    <>
      <EuiFormRow
        label={i18n.QUERY_PREVIEW_LABEL}
        helpText={i18n.QUERY_PREVIEW_HELP_TEXT}
        error={undefined}
        isInvalid={false}
        data-test-subj={dataTestSubj}
        describedByIds={idAria ? [idAria] : undefined}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiSelect
              id="queryPreviewSelect"
              options={options}
              value={timeframe}
              onChange={handleSelectPreviewTimeframe}
              aria-label={i18n.PREVIEW_SELECT_ARIA}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handlePreviewClicked}>
              {i18n.PREVIEW_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      {showHistogram && result == null && (
        <FlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </FlexGroup>
      )}
      {showHistogram && result != null && (
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h2 data-test-subj="header-section-title">
                {i18n.QUERY_PREVIEW_TITLE(result.total)}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            {/* <BarChart
              configs={{
                series: { xScaleType: ScaleType.Time, yScaleType: ScaleType.Linear },
                axis: {
                  xTickFormatter: histogramDateTimeFormatter([result.gte, result.lte]),
                },
                customHeight: 200,
                settings: {
                  showLegend: false,
                },
              }}
              barChart={[{ key: 'hits', value: result.data }]}
              stackByField={undefined}
              timelineId={undefined}
              style={{ width: '100%' }}
            /> */}
            <Chart size={{ height: 200 }}>
              <Settings theme={theme} showLegend={false} />
              <BarSeries
                id={ID}
                name={i18n.QUERY_PREVIEW_GRAPH_NAME}
                data={result ? result.data : []}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={0}
                yAccessors={[1]}
                timeZone={timeZone}
              />

              <Axis
                id={`${ID}-time`}
                position={Position.Bottom}
                tickFormat={niceTimeFormatter([Number(result.gte), Number(result.lte)])}
              />
              <Axis title={i18n.QUERY_GRAPH_COUNT} id={`${ID}-count`} position={Position.Left} />
            </Chart>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
