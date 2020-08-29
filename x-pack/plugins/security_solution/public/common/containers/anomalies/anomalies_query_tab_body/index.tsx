/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import { AnomaliesQueryTabBodyProps } from './types';
import { getAnomaliesFilterQuery } from './utils';
import { useInstalledSecurityJobs } from '../../../components/ml/hooks/use_installed_security_jobs';
import { useUiSetting$ } from '../../../lib/kibana';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';
import { histogramConfigs } from './histogram_configs';
const ID = 'anomaliesOverTimeQuery';

export const AnomaliesQueryTabBody = ({
  deleteQuery,
  endDate,
  setQuery,
  skip,
  startDate,
  type,
  narrowDateRange,
  filterQuery,
  anomaliesFilterQuery,
  AnomaliesTableComponent,
  flowTarget,
  ip,
}: AnomaliesQueryTabBodyProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { jobs } = useInstalledSecurityJobs();
  const [anomalyScore] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const mergedFilterQuery = getAnomaliesFilterQuery(
    filterQuery,
    anomaliesFilterQuery,
    jobs,
    anomalyScore,
    flowTarget,
    ip
  );

  return (
    <>
      <MatrixHistogramContainer
        endDate={endDate}
        filterQuery={mergedFilterQuery}
        id={ID}
        setQuery={setQuery}
        sourceId="default"
        startDate={startDate}
        type={type}
        {...histogramConfigs}
      />
      <AnomaliesTableComponent
        startDate={startDate}
        endDate={endDate}
        skip={skip}
        type={type}
        narrowDateRange={narrowDateRange}
        flowTarget={flowTarget}
        ip={ip}
      />
    </>
  );
};

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
