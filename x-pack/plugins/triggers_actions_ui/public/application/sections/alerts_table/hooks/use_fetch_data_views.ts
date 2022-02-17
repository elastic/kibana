/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { DataViewBase } from '@kbn/es-query';
import { BASE_RAC_ALERTS_API_PATH } from '../../../../../../rule_registry/common';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';
import { HttpSetup } from '../../../../../../../../src/core/public';
import { Consumer } from '../types';

export function useFetchDataViews(
  consumers: Consumer[],
  http: HttpSetup,
  data: DataPublicPluginStart
) {
  const [dataViews, setDataViews] = useState<DataViewBase[]>([]);
  useEffect(() => {
    (async () => {
      const { index_name: indexNames } = await http.get<{ index_name: string[] }>(
        `${BASE_RAC_ALERTS_API_PATH}/index`,
        {
          query: { features: consumers.map(({ id }) => id).join(',') },
        }
      );
      setDataViews([
        {
          id: 'dynamic-alerts-table-index-pattern',
          title: indexNames.join(','),
          fields: await data.dataViews.getFieldsForWildcard({
            pattern: indexNames.join(','),
            allowNoIndex: true,
          }),
        },
      ]);
    })();
  }, [consumers, http, data.dataViews]);
  return { dataViews };
}
