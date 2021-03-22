/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from '../../../..';
import { IKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../../plugin';
import { AllShortSeries } from './use_url_strorage';
import { ReportToDataTypeMap } from '../configurations/constants';
import {
  DataType,
  ObservabilityIndexPatterns,
} from '../../../../utils/observability_Index_patterns';

export const useInitExploratoryView = (storage: IKbnUrlStateStorage) => {
  const {
    services: { data },
  } = useKibana<ObservabilityClientPluginsStart>();

  const allSeriesKey = 'sr';

  const allSeries = storage.get<AllShortSeries>(allSeriesKey) ?? {};

  const allSeriesIds = Object.keys(allSeries);

  const firstSeriesId = allSeriesIds?.[0];

  const firstSeries = allSeries[firstSeriesId];

  const { data: indexPattern, status } = useFetcher(() => {
    const obsvIndexP = new ObservabilityIndexPatterns(data);
    let reportType: DataType = 'apm';
    if (firstSeries?.rt) {
      reportType = ReportToDataTypeMap[firstSeries?.rt];
    }
    if (firstSeries?.reportType) {
      reportType = ReportToDataTypeMap[firstSeries?.reportType];
    }

    return obsvIndexP.getIndexPattern(reportType);
  }, [firstSeries?.rt]);

  return useMemo(() => {
    return indexPattern;
  }, [status]);
};
