/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../state';
import { getJourneySteps } from '../../../state/actions/journey';
import { JourneyState } from '../../../state/reducers/journey';

export const useCheckSteps = (): JourneyState => {
  const { checkGroupId } = useParams<{ checkGroupId: string }>();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      getJourneySteps({
        checkGroup: checkGroupId,
      })
    );
  }, [checkGroupId, dispatch]);

  const checkGroup = useSelector((state: AppState) => {
    return state.journeys[checkGroupId];
  });

  return {
    checkGroup: checkGroupId,
    steps: checkGroup?.steps ?? [],
    details: checkGroup?.details,
    loading: checkGroup?.loading ?? false,
    error: checkGroup?.error,
  };
};
