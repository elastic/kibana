/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/public';
import { MatrixHistogramType } from '../../../../common/search_strategy';
import { EVENT_DATASET } from '../../../../common/cti/constants';
import { useMatrixHistogram } from '../../../common/containers/matrix_histogram';
import { useKibana } from '../../../common/lib/kibana';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';

export const useRequestEventCounts = (to: string, from: string) => {
  const { uiSettings } = useKibana().services;
  const defaultThreatIndices = uiSettings.get<string[]>(DEFAULT_THREAT_INDEX_KEY);

  const [filterQuery] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    indexPattern: {
      fields: [
        {
          name: 'event.kind',
          type: 'string',
        },
      ],
      title: defaultThreatIndices.toString(),
    },
    queries: [{ query: 'event.type:indicator', language: 'kuery' }],
    filters: [],
  });

  const matrixHistogramRequest = useMemo(() => {
    return {
      endDate: to,
      errorMessage: i18n.translate('xpack.securitySolution.overview.errorFetchingEvents', {
        defaultMessage: 'Error fetching events',
      }),
      filterQuery,
      histogramType: MatrixHistogramType.events,
      indexNames: defaultThreatIndices,
      stackByField: EVENT_DATASET,
      startDate: from,
      size: 0,
    };
  }, [to, from, filterQuery, defaultThreatIndices]);

  const results = useMatrixHistogram(matrixHistogramRequest);

  return results;
};
