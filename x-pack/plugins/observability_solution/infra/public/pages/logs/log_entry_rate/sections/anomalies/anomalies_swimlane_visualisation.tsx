/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimLaneEmbeddableState,
  AnomalySwimLaneEmbeddableApi,
} from '@kbn/ml-plugin/public';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { AutoRefresh } from '../../use_log_entry_rate_results_url_state';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { partitionField } from '../../../../../../common/infra_ml';
import { TimeRange } from '../../../../../../common/time/time_range';

interface Props {
  timeRange: TimeRange;
  jobIds: string[];
  selectedDatasets: string[];
  autoRefresh: AutoRefresh;
}

// Disable refresh, allow our timerange changes to refresh the embeddable.
const REFRESH_CONFIG = {
  pause: true,
  value: 0,
};

export const AnomaliesSwimlaneVisualisation: React.FC<Props> = (props) => {
  const { embeddable: embeddablePlugin } = useKibanaContextForPlugin().services;
  if (!embeddablePlugin) return null;
  return <VisualisationContent {...props} />;
};

export const VisualisationContent: React.FC<Props> = ({ timeRange, jobIds, selectedDatasets }) => {
  const embeddableState: AnomalySwimLaneEmbeddableState = useMemo(() => {
    return {
      jobIds,
      swimlaneType: 'viewBy',
      timeRange: {
        from: moment(timeRange.startTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        to: moment(timeRange.endTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      },
      refreshConfig: REFRESH_CONFIG,
      viewBy: partitionField,
      filters: [],
      query: {
        language: 'kuery',
        query: selectedDatasets
          .map((dataset) => `${partitionField} : ${dataset !== '' ? dataset : '""'}`)
          .join(' or '), // Ensure unknown (those with an empty "" string) datasets are handled correctly.
      },
    };
  }, [jobIds, timeRange.startTime, timeRange.endTime, selectedDatasets]);

  return (
    <ReactEmbeddableRenderer<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi>
      maybeId={'LOG_ENTRY_ANOMALIES_EMBEDDABLE_INSTANCE'}
      type={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE}
      state={{
        rawState: embeddableState,
      }}
    />
  );
};
