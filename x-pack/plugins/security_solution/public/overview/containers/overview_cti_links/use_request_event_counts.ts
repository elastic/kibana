/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { esQuery } from '../../../../../../../src/plugins/data/public';
import { MatrixHistogramType } from '../../../../common/search_strategy';
import { EVENT_DATASET, DEFAULT_CTI_SOURCE_INDEX } from '../../../../common/cti/constants';
import { useMatrixHistogram } from '../../../common/containers/matrix_histogram';
import { useKibana } from '../../../common/lib/kibana';

export const useRequestEventCounts = (to: string, from: string) => {
  const { uiSettings } = useKibana().services;

  const [filterQuery] = convertToBuildEsQuery({
    config: esQuery.getEsQueryConfig(uiSettings),
    indexPattern: {
      fields: [
        {
          name: 'event.kind',
          aggregatable: true,
          searchable: true,
          type: 'string',
          esTypes: ['keyword'],
        },
      ],
      title: 'filebeat-*',
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
      indexNames: DEFAULT_CTI_SOURCE_INDEX,
      stackByField: EVENT_DATASET,
      startDate: from,
      size: 0,
    };
  }, [to, from, filterQuery]);

  const results = useMatrixHistogram(matrixHistogramRequest);

  return results;
};
