/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import numeral from '@elastic/numeral';

import { EuiFlexItem, EuiPanel, EuiSelect } from '@elastic/eui';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { useGlobalFullScreen } from '../../containers/use_full_screen';

import { AlertsComponentsProps } from './types';
import { AlertsTable } from './alerts_table';
import * as i18n from './translations';
import { useUiSetting$ } from '../../lib/kibana';
import { MatrixHistogram } from '../matrix_histogram';
import { histogramConfigs } from './histogram_configs';
import { MatrixHistogramConfigs, MatrixHistogramOption } from '../matrix_histogram/types';
import { StartServices } from '../../../types';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { STACK_BY } from '../matrix_histogram/translations';
import {
  indexPatternList,
  reportConfigMap,
} from '../../../app/exploratory_view/security_exploratory_view';
import { ReportTypes } from '../../../../../observability/public';

const ID = 'alertsHistogramQuery';

const AlertsViewComponent: React.FC<AlertsComponentsProps> = ({
  timelineId,
  deleteQuery,
  endDate,
  entityType,
  filterQuery,
  indexNames,
  pageFilters,
  setQuery,
  startDate,
}) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const { globalFullScreen } = useGlobalFullScreen();

  const { observability } = useKibana<StartServices>().services;
  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;
  const [selectedStackByOption, setSelectedStackByOption] = useState<MatrixHistogramOption>(
    histogramConfigs.defaultStackByOption
  );

  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        histogramConfigs.stackByOptions.find((co) => co.value === event.target.value) ??
          histogramConfigs.defaultStackByOption
      );
    },
    []
  );

  const getSubtitle = useCallback(
    (totalCount: number) =>
      `${i18n.SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${i18n.UNIT(
        totalCount
      )}`,
    [defaultNumberFormat]
  );

  const alertsHistogramConfigs: MatrixHistogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      subtitle: getSubtitle,
    }),
    [getSubtitle]
  );

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  const appendTitle = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        {histogramConfigs.stackByOptions.length > 1 && (
          <EuiSelect
            onChange={setSelectedChartOptionCallback}
            options={histogramConfigs.stackByOptions}
            prepend={STACK_BY}
            value={selectedStackByOption?.value}
            compressed={true}
          />
        )}
      </EuiFlexItem>
    ),
    [selectedStackByOption?.value, setSelectedChartOptionCallback]
  );

  return (
    <>
      {!globalFullScreen && (
        <MatrixHistogram
          endDate={endDate}
          filterQuery={filterQuery}
          id={ID}
          indexNames={indexNames}
          setQuery={setQuery}
          startDate={startDate}
          {...alertsHistogramConfigs}
        />
      )}
      {!globalFullScreen && (
        <EuiPanel color="transparent" hasBorder style={{ height: 300 }}>
          <ExploratoryViewEmbeddable
            appId="security"
            appendHeader={appendTitle}
            title={i18n.ALERTS_GRAPH_TITLE}
            reportConfigMap={reportConfigMap}
            dataTypesIndexPatterns={indexPatternList}
            reportType={ReportTypes.KPI}
            attributes={[
              {
                reportDefinitions: {
                  [selectedStackByOption.value]: ['ALL_VALUES'],
                },
                name: selectedStackByOption.value,
                dataType: 'security',
                selectedMetricField: 'EXTERNAL_ALERTS',
                breakdown: selectedStackByOption.value,
                time: { from: startDate, to: endDate },
                seriesType: 'bar_stacked',
              },
            ]}
            legendIsVisible={true}
            axisTitlesVisibility={{
              x: false,
              yLeft: false,
              yRight: false,
            }}
            disableBorder
            disableShadow
            compressed
            customHeight="100%"
          />
        </EuiPanel>
      )}
      <AlertsTable
        timelineId={timelineId}
        endDate={endDate}
        entityType={entityType}
        startDate={startDate}
        pageFilters={pageFilters}
      />
    </>
  );
};

AlertsViewComponent.displayName = 'AlertsViewComponent';

export const AlertsView = React.memo(AlertsViewComponent);
