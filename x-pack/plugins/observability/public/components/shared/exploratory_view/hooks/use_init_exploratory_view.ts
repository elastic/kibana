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
import { AllSeries } from './use_url_strorage';
import { REPORT_TYPE, ReportToDataTypeMap } from '../configurations/constants';
import { ObservabilityIndexPatterns } from '../../../../utils/observability_Index_patterns';

export const useInitExploratoryView = (storage: IKbnUrlStateStorage) => {
  const {
    services: { data },
  } = useKibana<ObservabilityClientPluginsStart>();

  const allSeriesKey = 'sr';

  const allSeries = storage.get<AllSeries>(allSeriesKey) ?? {};

  const allSeriesIds = Object.keys(allSeries);

  const firstSeriesId = allSeriesIds?.[0];

  const firstSeries = allSeries[firstSeriesId];

  const { data: indexPattern, status } = useFetcher(() => {
    const obsvIndexP = new ObservabilityIndexPatterns(data);
    return obsvIndexP.getIndexPattern(ReportToDataTypeMap[firstSeries?.[REPORT_TYPE]] ?? 'apm');
  }, [firstSeries?.[REPORT_TYPE]]);

  return useMemo(() => {
    return indexPattern;
  }, [status]);
};
