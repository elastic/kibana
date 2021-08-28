/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import React, { useMemo } from 'react';
import { EmbeddableRenderer } from '../../../../../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable_renderer';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../../../../../../../ml/public/embeddables/constants';
import type { AnomalySwimlaneEmbeddableInput } from '../../../../../../../ml/public/embeddables/types';
import { partitionField } from '../../../../../../common/infra_ml/job_parameters';
import type { TimeRange } from '../../../../../../common/time/time_range';
import { MissingEmbeddableFactoryCallout } from '../../../../../components/missing_embeddable_factory_callout';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import type { AutoRefresh } from '../../use_log_entry_rate_results_url_state';

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
