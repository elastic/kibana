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
import { EmbeddableHistogram } from '../matrix_histogram/embeddable_histogram';
import { STACK_BY } from '../matrix_histogram/translations';
import { useSourcererDataView } from '../../containers/sourcerer';
import { getExternalAlertConfigs } from '../../../hosts/configs/external_alert';
import { ALERTS_GRAPH_TITLE } from './translations';

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

  const { patternList, dataViewId } = useSourcererDataView();
  const customLensAttrs = useMemo(() => {
    const configs = getExternalAlertConfigs({ stackByField: selectedStackByOption.value });
    return {
      ...configs,
      references: configs.references.map((ref) => ({ ...ref, id: dataViewId })),
    };
  }, [dataViewId, selectedStackByOption.value]);

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
          <EmbeddableHistogram
            title={ALERTS_GRAPH_TITLE}
            appendTitle={appendTitle}
            dataTypesIndexPatterns={patternList?.join(',')}
            customLensAttrs={customLensAttrs}
            customTimeRange={{ from: startDate, to: endDate }}
            isSingleMetric={false}
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
