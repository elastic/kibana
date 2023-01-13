/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { DonutChartWrapper } from '../../../../common/components/charts/donutchart';
import { useRefetchByRestartingSession } from '../../../../common/components/page/use_refetch_by_session';
import { getAlertsByStatusAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_by_status_donut';
import { LensEmbeddable } from '../../../../common/components/visualization_actions/lens_embeddable';
import type { EmbeddableData } from '../../../../common/components/visualization_actions/types';
import { parseVisualizationData } from '../../../../common/components/visualization_actions/utils';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsActions, inputsSelectors } from '../../../../common/store/inputs';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { ChartLabel } from './chart_label';
import type { AlertDonutEmbeddableProps, VisualizationAlertsByStatusResponse } from './types';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from './types';

const ChartSize = '135px';

const AlertDonutEmbeddableComponent: React.FC<AlertDonutEmbeddableProps> = ({
  filters,
  status,
  timerange,
  label,
}) => {
  const dispatch = useDispatch();
  const queryId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-${status}`;
  const { session, refetchByRestartingSession } = useRefetchByRestartingSession({
    inputId: InputsModelId.global,
    queryId,
  });
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { inspect } = useDeepEqualSelector((state) => getGlobalQuery(state, queryId));
  const visualizationData = inspect?.response
    ? parseVisualizationData<VisualizationAlertsByStatusResponse>(inspect?.response)
    : null;

  const onEmbeddableLoad = useCallback(
    ({ requests, responses, isLoading }: EmbeddableData) => {
      dispatch(
        inputsActions.setQuery({
          inputId: InputsModelId.global,
          id: queryId,
          searchSessionId: session.current.start(),
          refetch: refetchByRestartingSession,
          loading: isLoading,
          inspect: { dsl: requests, response: responses },
        })
      );
    },
    [dispatch, queryId, refetchByRestartingSession, session]
  );

  const extraOptions = useMemo(() => ({ status, filters }), [status, filters]);

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId: InputsModelId.global,
        id: queryId,
        searchSessionId: session.current.start(),
        refetch: refetchByRestartingSession,
        loading: false,
        inspect: null,
      })
    );
  }, [dispatch, queryId, refetchByRestartingSession, session, status]);

  useEffect(() => {
    return () => {
      dispatch(
        inputsActions.deleteOneQuery({
          inputId: InputsModelId.global,
          id: queryId,
        })
      );
    };
  }, [dispatch, queryId]);

  const dataExists = visualizationData != null && visualizationData[0].hits.total !== 0;

  return (
    <DonutChartWrapper
      isChartEmbeddablesEnabled={true}
      dataExists={dataExists}
      label={label}
      title={dataExists ? <ChartLabel count={visualizationData[0].hits.total} /> : null}
    >
      <LensEmbeddable
        timerange={timerange}
        extraOptions={extraOptions}
        height={ChartSize}
        width={ChartSize}
        onLoad={onEmbeddableLoad}
        getLensAttributes={getAlertsByStatusAttributes}
        stackByField="kibana.alert.workflow_status"
        scopeId={SourcererScopeName.detections}
        id={queryId}
      />
    </DonutChartWrapper>
  );
};

export const AlertDonutEmbeddable = React.memo(AlertDonutEmbeddableComponent);
