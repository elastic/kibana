/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import numeral from '@elastic/numeral';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { useGlobalFullScreen } from '../../containers/use_full_screen';

import { AlertsComponentsProps } from './types';
import { AlertsTable } from './alerts_table';
import * as i18n from './translations';
import { useUiSetting$ } from '../../lib/kibana';
import { MatrixHistogram } from '../matrix_histogram';
import { histogramConfigs } from './histogram_configs';
import { MatrixHistogramConfigs } from '../matrix_histogram/types';

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
