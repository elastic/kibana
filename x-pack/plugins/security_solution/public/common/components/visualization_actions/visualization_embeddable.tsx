/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ChartLabel } from '../../../overview/components/detection_response/alerts_by_status/chart_label';
import type { VisualizationAlertsByStatusResponse } from '../../../overview/components/detection_response/alerts_by_status/types';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsActions, inputsSelectors } from '../../store/inputs';
import { DonutChartWrapper } from '../charts/donutchart';
import { parseVisualizationData } from './utils';
import { InputsModelId } from '../../store/inputs/constants';
import { useRefetchByRestartingSession } from '../page/use_refetch_by_session';
import { LensEmbeddable } from './lens_embeddable';
import type { EmbeddableData, VisualizationEmbeddableProps } from './types';

const VisualizationEmbeddableComponent: React.FC<VisualizationEmbeddableProps> = (props) => {
  const dispatch = useDispatch();
  const { inputId = InputsModelId.global, id, isDonut, label, onLoad, ...lensPorps } = props;
  const { session, refetchByRestartingSession } = useRefetchByRestartingSession({
    inputId,
    queryId: id,
  });
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { inspect } = useDeepEqualSelector((state) => getGlobalQuery(state, id));
  const visualizationData = inspect?.response
    ? parseVisualizationData<VisualizationAlertsByStatusResponse>(inspect?.response)
    : null;
  const dataExists = visualizationData != null && visualizationData[0]?.hits.total !== 0;

  const onEmbeddableLoad = useCallback(
    ({ requests, responses, isLoading }: EmbeddableData) => {
      dispatch(
        inputsActions.setQuery({
          inputId,
          id,
          searchSessionId: session.current.start(),
          refetch: refetchByRestartingSession,
          loading: isLoading,
          inspect: { dsl: requests, response: responses },
        })
      );

      if (typeof onLoad === 'function') {
        onLoad({ requests, responses, isLoading });
      }
    },
    [dispatch, inputId, id, session, refetchByRestartingSession, onLoad]
  );

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId,
        id,
        searchSessionId: session.current.start(),
        refetch: refetchByRestartingSession,
        loading: false,
        inspect: null,
      })
    );
  }, [dispatch, inputId, id, refetchByRestartingSession, session]);

  useEffect(() => {
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId, id }));
    };
  }, [dispatch, id, inputId]);

  if (isDonut) {
    return (
      <DonutChartWrapper
        isChartEmbeddablesEnabled={true}
        dataExists={dataExists}
        label={label}
        title={dataExists ? <ChartLabel count={visualizationData[0]?.hits.total} /> : null}
      >
        <LensEmbeddable {...lensPorps} id={id} onLoad={onEmbeddableLoad} />
      </DonutChartWrapper>
    );
  }

  return <LensEmbeddable {...lensPorps} id={id} onLoad={onEmbeddableLoad} />;
};

export const VisualizationEmbeddable = React.memo(VisualizationEmbeddableComponent);
