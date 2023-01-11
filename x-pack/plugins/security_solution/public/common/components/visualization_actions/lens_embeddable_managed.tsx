/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { inputsActions } from '../../store/inputs';
import { InputsModelId } from '../../store/inputs/constants';
import { useRefetchByRestartingSession } from '../page/use_refetch_by_session';
import { LensEmbeddable } from './lens_embeddable';
import type { EmbeddableData, VisualizationEmbeddableProps } from './types';

const VisualizationEmbeddableComponent: React.FC<VisualizationEmbeddableProps> = (props) => {
  const dispatch = useDispatch();
  const { inputId = InputsModelId.global, id, onLoad, ...lensPorps } = props;
  const { searchSessionId, refetchByRestartingSession } = useRefetchByRestartingSession({
    inputId,
    queryId: id,
  });

  const onEmbeddableLoad = useCallback(
    ({ requests, responses, isLoading }: EmbeddableData) => {
      dispatch(
        inputsActions.setQuery({
          inputId,
          id,
          searchSessionId,
          refetch: refetchByRestartingSession,
          loading: isLoading,
          inspect: { dsl: requests, response: responses },
        })
      );

      if (typeof onLoad === 'function') {
        onLoad({ requests, responses, isLoading });
      }
    },
    [dispatch, inputId, onLoad, id, refetchByRestartingSession, searchSessionId]
  );

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId,
        id,
        searchSessionId,
        refetch: refetchByRestartingSession,
        loading: false,
        inspect: null,
      })
    );
  }, [dispatch, inputId, id, refetchByRestartingSession, searchSessionId]);

  return <LensEmbeddable {...lensPorps} id={id} onLoad={onEmbeddableLoad} />;
};

export const VisualizationEmbeddable = React.memo(VisualizationEmbeddableComponent);
