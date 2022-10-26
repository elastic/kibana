/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useKibana } from '../../lib/kibana';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';

interface UseRefetchByRestartingSessionProps {
  inputId?: InputsModelId;
  queryId: string;
}

export const useRefetchByRestartingSession = ({
  inputId,
  queryId,
}: UseRefetchByRestartingSessionProps) => {
  const dispatch = useDispatch();
  const { data } = useKibana().services;
  const session = useRef(data.search.session);
  const searchSessionId = session.current.start();
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const { selectedInspectIndex } = useDeepEqualSelector((state) =>
    inputId === 'global' ? getGlobalQuery(state, queryId) : getTimelineQuery(state, queryId)
  );

  const refetchByRestartingSession = useCallback(() => {
    dispatch(
      inputsActions.setInspectionParameter({
        id: queryId,
        selectedInspectIndex,
        isInspected: false,
        inputId: InputsModelId.global,
        searchSessionId: session.current.start(),
      })
    );
  }, [dispatch, queryId, selectedInspectIndex]);

  useEffect(() => {
    return () => {
      data.search.session.clear();
    };
  });

  return { searchSessionId, session, refetchByRestartingSession };
};
