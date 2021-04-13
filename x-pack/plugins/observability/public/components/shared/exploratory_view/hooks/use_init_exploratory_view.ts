/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useFetcher } from '../../../..';
import { IKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import { AllShortSeries } from './use_url_storage';
import { ReportToDataTypeMap } from '../configurations/constants';
import { DataType, ObservabilityIndexPatterns } from '../utils/observability_index_patterns';

export const useInitExploratoryView = (storage: IKbnUrlStateStorage) => {
  const {
    services: { data },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const allSeriesKey = 'sr';

  const allSeries = storage.get<AllShortSeries>(allSeriesKey) ?? {};

  const allSeriesIds = Object.keys(allSeries);

  const firstSeriesId = allSeriesIds?.[0];

  const firstSeries = allSeries[firstSeriesId];

  let dataType: DataType = firstSeries?.dataType ?? 'rum';

  if (firstSeries?.rt) {
    dataType = ReportToDataTypeMap[firstSeries?.rt];
  }

  const { data: indexPattern, error } = useFetcher(() => {
    const obsvIndexP = new ObservabilityIndexPatterns(data);

    return obsvIndexP.getIndexPattern(dataType);
  }, [dataType, data]);

  if (error) {
    throw error;
  }

  return indexPattern;
};
