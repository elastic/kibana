/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { FETCH_STATUS, useFetcher } from '../../../../../observability/public';
import { fetchJourneySteps } from '../../../state/api/journey';
import { JourneyState } from '../../../state/reducers/journey';

export const useCheckSteps = (): JourneyState => {
  const { checkGroupId } = useParams<{ checkGroupId: string }>();

  const { data, status, error } = useFetcher(() => {
    return fetchJourneySteps({
      checkGroup: checkGroupId,
    });
  }, [checkGroupId]);

  return {
    error,
    checkGroup: checkGroupId,
    steps: data?.steps ?? [],
    details: data?.details,
    loading: status === FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING,
  };
};
