/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { getListOfSloSummaryIndices } from '../../../../common/summary_indices';
import { useKibana } from '../../../utils/kibana_react';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../../common/constants';
import { useGetSettings } from '../../slo_settings/use_get_settings';

export const useSloSummaryDataView = () => {
  const settings = useGetSettings();
  const { http } = useKibana().services;

  const { useAllRemoteClusters, selectedRemoteClusters } = settings;

  const hasRemoteClusters = !(!useAllRemoteClusters && selectedRemoteClusters.length === 0);

  const { data: index } = useFetcher(async () => {
    if (!hasRemoteClusters) {
      return SLO_SUMMARY_DESTINATION_INDEX_PATTERN;
    }
    const remoteClusters = await fetchRemoteClusters(http);
    return getListOfSloSummaryIndices(settings, remoteClusters);
  }, [hasRemoteClusters, http, settings]);

  const { dataView } = useCreateDataView({
    indexPatternString: index,
  });

  return { dataView };
};

const fetchRemoteClusters = async (http: HttpSetup) => {
  return await http.get<Array<{ name: string; isConnected: boolean }>>('/api/remote_clusters');
};
