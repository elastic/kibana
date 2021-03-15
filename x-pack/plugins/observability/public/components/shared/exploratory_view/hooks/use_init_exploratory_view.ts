/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../..';
import { IKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../../plugin';
import { AllSeries } from './use_url_strorage';
import { REPORT_TYPE } from '../configurations/constants';
import { useMemo } from 'react';

const APM_STATIC_INDEX_PATTERN_ID = 'apm_static_index_pattern_id';

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
    if (firstSeries?.[REPORT_TYPE] === 'upp') {
      return data.indexPatterns.get('df32db00-819e-11eb-87f5-d7da22b1dde3');
    }
    return data.indexPatterns.get(APM_STATIC_INDEX_PATTERN_ID);
  }, [firstSeries?.[REPORT_TYPE]]);

  return useMemo(() => {
    return indexPattern;
  }, [status]);
};
