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
  AnomalySwimlaneEmbeddableInput,
} from '@kbn/ml-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { AutoRefresh } from '../../use_log_entry_rate_results_url_state';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { partitionField } from '../../../../../../common/infra_ml';
import { MissingEmbeddableFactoryCallout } from '../../../../../components/missing_embeddable_factory_callout';
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
  const { embeddable: embeddablePlugin } = useKibanaContextForPlugin().services;
  const factory = embeddablePlugin?.getEmbeddableFactory(ANOMALY_SWIMLANE_EMBEDDABLE_TYPE);

  const embeddableInput: AnomalySwimlaneEmbeddableInput = useMemo(() => {
    return {
      id: 'LOG_ENTRY_ANOMALIES_EMBEDDABLE_INSTANCE', // NOTE: This is the only embeddable on the anomalies page, a static string will do.
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

  if (!factory) {
    return <MissingEmbeddableFactoryCallout embeddableType={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE} />;
  }

  return <EmbeddableRenderer input={embeddableInput} factory={factory} />;
};
