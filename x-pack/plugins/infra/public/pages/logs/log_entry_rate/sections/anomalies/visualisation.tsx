/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AutoRefresh, StringTimeRange } from '../../use_log_entry_rate_results_url_state';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimlaneEmbeddableInput,
} from '../../../../../../../ml/public';
import { EmbeddableRenderer } from '../../../../../../../../../src/plugins/embeddable/public';
import { partitionField } from '../../../../../../common/infra_ml';

interface Props {
  stringTimeRange: StringTimeRange;
  jobIds: string[];
  selectedDatasets: string[];
  autoRefresh: AutoRefresh;
}

export const Visualisation: React.FC<Props> = (props) => {
  const { embeddable: embeddablePlugin } = useKibanaContextForPlugin().services;
  if (!embeddablePlugin) return null;
  return <VisualisationContent {...props} />;
};

export const VisualisationContent: React.FC<Props> = ({
  stringTimeRange,
  jobIds,
  selectedDatasets,
  autoRefresh,
}) => {
  const { embeddable: embeddablePlugin } = useKibanaContextForPlugin().services;
  const factory: any = embeddablePlugin!.getEmbeddableFactory(ANOMALY_SWIMLANE_EMBEDDABLE_TYPE);

  const refreshConfig = useMemo(() => {
    const { interval, isPaused } = autoRefresh;

    return {
      pause: isPaused,
      value: interval,
    };
  }, [autoRefresh]);

  const embeddableInput: AnomalySwimlaneEmbeddableInput = useMemo(() => {
    return {
      id: 'LOG_ENTRY_ANOMALIES_EMBEDDABLE_INSTANCE', // NOTE: This is the only embeddable on the anomalies page, a static string will do.
      jobIds,
      swimlaneType: 'viewBy',
      timeRange: { from: stringTimeRange.startTime, to: stringTimeRange.endTime },
      refreshConfig,
      viewBy: partitionField,
      filters: [],
      query: {
        language: 'kuery',
        query: selectedDatasets
          .map((dataset) => `${partitionField} : ${dataset !== '' ? dataset : '""'}`)
          .join(' or '), // Ensure unknown (those with an empty "" string) datasets are handled correctly.
      },
    };
  }, [jobIds, stringTimeRange, selectedDatasets, refreshConfig]);

  return <EmbeddableRenderer input={embeddableInput} factory={factory} />;
};
