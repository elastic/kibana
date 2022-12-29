/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DonutChartWrapper } from '../../../../common/components/charts/donutchart';
import { useRefetchByRestartingSession } from '../../../../common/components/page/use_refetch_by_session';
import { getAlertsBySeverityAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_donut';
import { LensEmbeddable } from '../../../../common/components/visualization_actions/lens_embeddable';
import type { EmbeddableData } from '../../../../common/components/visualization_actions/types';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { ChartLabel } from './chart_label';
import type { AlertDonutEmbeddableProps, VisualizationAlertsByStatusData } from './types';

const ChartSize = '135px';

const AlertDonutEmbeddableComponent: React.FC<AlertDonutEmbeddableProps> = ({
  status,
  setQuery,
  timerange,
  label,
}) => {
  const { searchSessionId, refetchByRestartingSession } = useRefetchByRestartingSession({
    inputId: InputsModelId.global,
    queryId: `alertsStatus${status}`,
  });
  const [visualizationData, setVisualizationData] = useState<VisualizationAlertsByStatusData>();

  const onEmbeddableLoad = useCallback(
    (result: EmbeddableData) => {
      setVisualizationData(result as VisualizationAlertsByStatusData);
    },
    [setVisualizationData]
  );

  const extraOptions = useMemo(() => ({ status }), [status]);

  useEffect(() => {
    setQuery({
      id: `alertsStatus${status}`,
      searchSessionId,
      refetch: refetchByRestartingSession,
      loading: false,
      inspect: null,
    });
  }, [refetchByRestartingSession, searchSessionId, setQuery, status]);

  const dataExists = visualizationData != null && visualizationData.responses[0].hits.total !== 0;

  return (
    <DonutChartWrapper
      isChartEmbeddablesEnabled={true}
      dataExists={dataExists}
      label={label}
      title={dataExists ? <ChartLabel count={visualizationData.responses[0].hits.total} /> : null}
    >
      <LensEmbeddable
        timerange={timerange}
        extraOptions={extraOptions}
        height={ChartSize}
        width={ChartSize}
        onLoad={onEmbeddableLoad}
        getLensAttributes={getAlertsBySeverityAttributes}
        stackByField="kibana.alert.workflow_status"
        scopeId={SourcererScopeName.detections}
        id={`alertsStatus${status}`}
      />
    </DonutChartWrapper>
  );
};

export const AlertDonutEmbeddable = React.memo(AlertDonutEmbeddableComponent);
